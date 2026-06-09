import type { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db.ts";
import { issueTokens } from "../../utils/generateToken.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

const JWT_SECRET = process.env.JWT_SECRET!;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

// Note: For end-users, we specify a different callback URL than the developer-console one.
// The developer registers this callback URL in their GitHub OAuth App.
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL_SDK ??
  "http://localhost:8080/sdk/auth/oauth/github/callback";

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

/**
 * Initiates the OAuth flow for an end-user.
 * GET /sdk/auth/oauth/:provider/authorize
 */
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
      error: `Unsupported OAuth provider: ${provider}`,
    });
  }

  try {
    // 1. Fetch project settings
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { settings: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const settings = project.settings;
    if (!settings) {
      return res.status(500).json({
        success: false,
        error: "Project settings not initialized",
      });
    }

    // 2. Validate provider is enabled in settings
    const enabledProviders = settings.enabledAuthProviders || [];
    if (enabledProviders.length > 0 && !enabledProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `OAuth provider ${provider} is not enabled for this project`,
      });
    }

    // 3. Strict Origin Validation using new URL()
    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid redirectUrl format",
      });
    }

    const allowedUrls = settings.allowedCallbackUrls || [];
    const isWhitelisted = allowedUrls.some((allowedStr) => {
      try {
        const allowedUrl = new URL(allowedStr);
        // Ensure both origin and paths match correctly or origins match for flexibility
        return parsedRedirect.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });

    // Fallback: If whitelist is empty, we allow localhost/early dev.
    // In production, developers MUST specify allowed callback URLs.
    if (allowedUrls.length > 0 && !isWhitelisted) {
      return res.status(403).json({
        success: false,
        error: "The redirectUrl origin is not whitelisted in Quellix Project Settings",
      });
    }

    // 4. Sign OAuth State using JWT
    const statePayload: OAuthStatePayload = {
      projectId,
      redirectUrl,
      provider,
      nonce: Math.random().toString(36).substring(2),
    };

    const signedState = jwt.sign(statePayload, JWT_SECRET, { expiresIn: "15m" });

    // 5. Redirect to provider authorize page
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state: signedState,
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    console.error("[OAuth Authorize] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during OAuth authorization",
    });
  }
}

/**
 * Handles the OAuth provider redirect callback.
 * GET /sdk/auth/oauth/:provider/callback
 */
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
      error: error ? String(error) : "Missing code or state parameters",
    });
  }

  try {
    // 1. Verify signed state JWT
    let statePayload: OAuthStatePayload;
    try {
      statePayload = jwt.verify(state, JWT_SECRET) as OAuthStatePayload;
    } catch {
      return res.status(400).json({
        success: false,
        error: "OAuth state parameter is invalid or has expired",
      });
    }

    const { projectId, redirectUrl } = statePayload;

    // 2. Exchange code for access token
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
      console.error("[GitHub OAuth Callback] Token exchange failed:", tokenRes.data);
      return res.redirect(`${redirectUrl}#error=github_token_exchange_failed`);
    }

    const ghHeaders = {
      Authorization: `Bearer ${ghAccessToken}`,
      Accept: "application/vnd.github+json",
    };

    // 3. Fetch profile and emails
    const [profileRes, emailsRes] = await Promise.all([
      axios.get<GitHubUser>("https://api.github.com/user", {
        headers: ghHeaders,
      }),
      axios.get<GitHubEmail[]>("https://api.github.com/user/emails", {
        headers: ghHeaders,
      }),
    ]);

    const profile = profileRes.data;
    const providerUserId = profile.id.toString();

    const primaryEmail =
      emailsRes.data.find((e) => e.primary && e.verified)?.email ??
      emailsRes.data.find((e) => e.verified)?.email ??
      profile.email;

    if (!primaryEmail) {
      return res.redirect(`${redirectUrl}#error=email_not_verified_on_github`);
    }

    // 4. Find or Create EndUser
    let endUser = await prisma.endUser.findFirst({
      where: {
        projectId,
        email: primaryEmail,
      },
    });

    let isNewUser = false;

    if (!endUser) {
      isNewUser = true;
      endUser = await prisma.endUser.create({
        data: {
          projectId,
          email: primaryEmail,
          firstName: profile.name ? profile.name.split(" ")[0] : null,
          lastName: profile.name ? profile.name.split(" ").slice(1).join(" ") : null,
          profileImageUrl: profile.avatar_url,
          emailVerified: true,
        },
      });
    }

    // 5. Link SocialAccount
    let socialAccount = await prisma.socialAccount.findFirst({
      where: {
        endUserId: endUser.id,
        provider,
      },
    });

    if (!socialAccount) {
      socialAccount = await prisma.socialAccount.create({
        data: {
          endUserId: endUser.id,
          provider,
          providerUserId,
          email: primaryEmail,
          accessToken: ghAccessToken,
        },
      });
    } else {
      socialAccount = await prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
          accessToken: ghAccessToken,
          updatedAt: new Date(),
        },
      });
    }

    // 6. Issue SDK sessions/tokens
    const tokens = await issueTokens(
      { type: "endUser", id: endUser.id, projectId },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
    );

    // 7. Log Auth Event
    await logAuthEvent({
      projectId,
      endUserId: endUser.id,
      type: isNewUser ? "oauth_register" : "oauth_login",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      metadata: { provider, email: primaryEmail },
    });

    // 8. Redirect with tokens in the URL Hash Fragment to avoid query log exposures
    const callbackUrl = new URL(redirectUrl);
    callbackUrl.hash = `access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;

    return res.redirect(callbackUrl.toString());
  } catch (error) {
    console.error("[OAuth Callback] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error during OAuth callback",
    });
  }
}
