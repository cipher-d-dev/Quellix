import type { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/db.ts";
import { issueTokens } from "../../utils/generateToken.ts";
import { encryptSecret } from "../../utils/totp.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

const JWT_SECRET = process.env.JWT_SECRET!;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL_SDK ??
  "http://localhost:8080/sdk/auth/oauth/github/callback";

// ---------------------------------------------------------------------------
// One-time code store
//
// After a successful OAuth callback we do NOT put tokens in the redirect URL.
// Instead we issue a short-lived one-time code, store the token pair in this
// map keyed by the code, and redirect the browser to:
//
//   redirectUrl?code=<32-byte-hex>
//
// The SDK then calls GET /sdk/auth/oauth/exchange?code=<code> which reads,
// deletes, and returns the tokens. The code is single-use and expires in
// 2 minutes, limiting the attack window even if the redirect URL is logged.
//
// In production with Redis available, we use Redis with a 2-minute TTL.
// Without Redis (dev mode) we use an in-process Map with the same TTL logic.
// ---------------------------------------------------------------------------

const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface PendingTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

// In-memory fallback store — keyed by one-time code
const pendingCodes = new Map<string, PendingTokens>();

// Prune expired codes every minute
setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of pendingCodes.entries()) {
    if (entry.expiresAt <= now) pendingCodes.delete(code);
  }
}, 60_000).unref();

function generateOAuthCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function storeOAuthCode(
  code: string,
  tokens: { accessToken: string; refreshToken: string },
): Promise<void> {
  // Prefer Redis when available — imported lazily to avoid a hard dep
  // when Redis isn't configured. The rateLimiter module already manages
  // the Redis client; here we just try to use it directly.
  try {
    // Dynamic import so we don't crash if redis isn't installed
    const redisModule = await import("redis").catch(() => null);
    if (redisModule && process.env.REDIS_URL) {
      const client = redisModule.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.setEx(
        `qlx:oauth:code:${code}`,
        Math.ceil(CODE_TTL_MS / 1000),
        JSON.stringify(tokens),
      );
      await client.disconnect();
      return;
    }
  } catch {
    // Fall through to memory store
  }

  pendingCodes.set(code, {
    ...tokens,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

async function consumeOAuthCode(
  code: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const redisModule = await import("redis").catch(() => null);
    if (redisModule && process.env.REDIS_URL) {
      const client = redisModule.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      const raw = await client.getDel(`qlx:oauth:code:${code}`);
      await client.disconnect();
      if (raw) return JSON.parse(raw);
      return null;
    }
  } catch {
    // Fall through to memory store
  }

  const entry = pendingCodes.get(code);
  if (!entry) return null;
  pendingCodes.delete(code); // single-use
  if (entry.expiresAt <= Date.now()) return null;
  return { accessToken: entry.accessToken, refreshToken: entry.refreshToken };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

interface OAuthStatePayload {
  projectId: string;
  redirectUrl: string;
  provider: string;
  nonce: string;
}

// ---------------------------------------------------------------------------
// GET /sdk/auth/oauth/:provider/authorize
//
// Initiates the OAuth flow for an end-user.
// Validates the project, provider, and redirect URL before redirecting.
// ---------------------------------------------------------------------------

export async function authorize(req: Request, res: Response) {
  const { provider } = req.params;
  const { projectId, redirectUrl } = req.query;

  if (typeof projectId !== "string" || typeof redirectUrl !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing required query parameters: projectId and redirectUrl",
    });
  }

  if (provider !== "github") {
    return res.status(400).json({
      success: false,
      error: `Unsupported OAuth provider: ${provider}. Supported: github`,
    });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { settings: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: "Project not found." });
    }

    const settings = project.settings;
    if (!settings) {
      return res.status(500).json({ success: false, error: "Project settings not initialised." });
    }

    // Guard: provider must be enabled for this project
    const enabledProviders = settings.enabledAuthProviders ?? [];
    if (enabledProviders.length > 0 && !enabledProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth provider "${provider}" is not enabled for this project.`,
      });
    }

    // Guard: redirectUrl origin must be whitelisted
    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUrl);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid redirectUrl format." });
    }

    const allowedUrls = settings.allowedCallbackUrls ?? [];
    if (allowedUrls.length > 0) {
      const isWhitelisted = allowedUrls.some((allowed) => {
        try {
          return parsedRedirect.origin === new URL(allowed).origin;
        } catch {
          return false;
        }
      });

      if (!isWhitelisted) {
        return res.status(403).json({
          success: false,
          error: "redirectUrl origin is not whitelisted in project settings.",
        });
      }
    }

    // Sign state JWT — binds the callback to this specific authorize request
    const statePayload: OAuthStatePayload = {
      projectId,
      redirectUrl,
      provider,
      nonce: crypto.randomBytes(8).toString("hex"),
    };
    const signedState = jwt.sign(statePayload, JWT_SECRET, { expiresIn: "15m" });

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state: signedState,
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    console.error("[OAuth Authorize]", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
}

// ---------------------------------------------------------------------------
// GET /sdk/auth/oauth/:provider/callback
//
// Handles the provider redirect. After exchanging the code for tokens and
// finding/creating the EndUser, we issue a short-lived one-time code and
// redirect to:
//
//   redirectUrl?code=<hex>
//
// The SDK then exchanges this code at /sdk/auth/oauth/exchange — tokens
// never appear in the URL and are therefore not in browser history or logs.
// ---------------------------------------------------------------------------

export async function callback(req: Request, res: Response) {
  const { provider } = req.params;
  const { code, error, state } = req.query;

  if (provider !== "github") {
    return res.status(400).json({
      success: false,
      error: `Unsupported OAuth provider: ${provider}`,
    });
  }

  if (error || !code || typeof state !== "string") {
    return res.status(400).json({
      success: false,
      error: error ? String(error) : "Missing code or state parameters.",
    });
  }

  try {
    // 1. Verify the signed state JWT
    let statePayload: OAuthStatePayload;
    try {
      statePayload = jwt.verify(state, JWT_SECRET) as OAuthStatePayload;
    } catch {
      return res.status(400).json({
        success: false,
        error: "OAuth state is invalid or has expired.",
      });
    }

    const { projectId, redirectUrl } = statePayload;

    // 2. Exchange GitHub code for a GitHub access token
    const tokenRes = await axios.post<{ access_token: string; error?: string }>(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: "application/json" } },
    );

    const ghAccessToken = tokenRes.data.access_token;
    if (!ghAccessToken || tokenRes.data.error) {
      console.error("[OAuth callback] GitHub token exchange failed:", tokenRes.data);
      return res.redirect(`${redirectUrl}?error=github_token_exchange_failed`);
    }

    const ghHeaders = {
      Authorization: `Bearer ${ghAccessToken}`,
      Accept: "application/vnd.github+json",
    };

    // 3. Fetch GitHub profile + verified emails in parallel
    const [profileRes, emailsRes] = await Promise.all([
      axios.get<GitHubUser>("https://api.github.com/user", { headers: ghHeaders }),
      axios.get<GitHubEmail[]>("https://api.github.com/user/emails", { headers: ghHeaders }),
    ]);

    const profile = profileRes.data;
    const providerUserId = profile.id.toString();

    const primaryEmail =
      emailsRes.data.find((e) => e.primary && e.verified)?.email ??
      emailsRes.data.find((e) => e.verified)?.email ??
      profile.email;

    if (!primaryEmail) {
      return res.redirect(`${redirectUrl}?error=no_verified_email_on_github`);
    }

    // 4. Find or create EndUser for this project
    let endUser = await prisma.endUser.findFirst({
      where: { projectId, email: primaryEmail },
    });

    const isNewUser = !endUser;

    if (!endUser) {
      endUser = await prisma.endUser.create({
        data: {
          projectId,
          email: primaryEmail,
          firstName: profile.name?.split(" ")[0] ?? null,
          lastName: profile.name?.split(" ").slice(1).join(" ") ?? null,
          profileImageUrl: profile.avatar_url,
          emailVerified: true,
        },
      });
    }

    // 5. Upsert SocialAccount
    // Store the provider access token encrypted — never plaintext.
    // Uses the same AES-256-GCM encryptSecret() from totp.ts.
    const encryptedAccessToken = encryptSecret(ghAccessToken);

    const existingSocial = await prisma.socialAccount.findFirst({
      where: { endUserId: endUser.id, provider },
    });

    if (!existingSocial) {
      await prisma.socialAccount.create({
        data: {
          endUserId: endUser.id,
          provider,
          providerUserId,
          email: primaryEmail,
          accessToken: encryptedAccessToken,
        },
      });
    } else {
      await prisma.socialAccount.update({
        where: { id: existingSocial.id },
        data: { accessToken: encryptedAccessToken, updatedAt: new Date() },
      });
    }

    // 6. Issue Quellix SDK session tokens
    const tokens = await issueTokens(
      { type: "endUser", id: endUser.id, projectId },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    // 7. Audit log
    await logAuthEvent({
      projectId,
      endUserId: endUser.id,
      type: isNewUser ? "oauth_register" : "oauth_login",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      metadata: { provider, email: primaryEmail },
    });

    // 8. Store tokens under a one-time code and redirect with ?code=<hex>
    //    Tokens never appear in the URL so they can't land in browser history,
    //    server access logs, or Referer headers.
    const oauthCode = generateOAuthCode();
    await storeOAuthCode(oauthCode, tokens);

    const callbackUrl = new URL(redirectUrl);
    callbackUrl.searchParams.set("code", oauthCode);

    return res.redirect(callbackUrl.toString());
  } catch (error) {
    console.error("[OAuth callback]", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
}

// ---------------------------------------------------------------------------
// GET /sdk/auth/oauth/exchange?code=<hex>
//
// Exchanges a one-time OAuth code for the actual access + refresh token pair.
// The code is single-use and expires after 2 minutes. After this call the
// code is deleted from the store regardless of success.
//
// This endpoint is called by the SDK immediately after the OAuth redirect
// lands on the application. It is the only way to retrieve the tokens.
// ---------------------------------------------------------------------------

export async function exchangeOAuthCode(req: Request, res: Response) {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      error: "code query parameter is required.",
    });
  }

  const tokens = await consumeOAuthCode(code);

  if (!tokens) {
    return res.status(400).json({
      success: false,
      error: "OAuth code is invalid or has expired. Please sign in again.",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
}
