import type { Request, Response } from "express";
import axios from "axios";
import { prisma } from "../config/db.ts";
import { issueTokens } from "../utils/generateToken.ts";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL ??
  "http://localhost:8080/api/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

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

// ---------------------------------------------------------------------------
// Step 1 — GET /auth/github
//
// Accepts an optional ?next= query param (e.g. /team/accept?token=xxx).
// We pass it through the OAuth round-trip via GitHub's `state` param so we
// can recover it in the callback and include it in the redirect to the
// frontend. The state is base64-encoded JSON — lightweight and avoids
// URL encoding issues.
// ---------------------------------------------------------------------------

export function redirectToGitHub(req: Request, res: Response) {
  const next = typeof req.query.next === "string" ? req.query.next : null;

  // Encode a small state payload: { next? }
  // GitHub requires the state param to be a string, so we base64-encode JSON.
  const statePayload = Buffer.from(JSON.stringify({ next })).toString(
    "base64url",
  );

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state: statePayload,
  });
  return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

// ---------------------------------------------------------------------------
// Step 2 — GET /auth/github/callback
//
// Merge / linking logic:
//
//  Case A  githubId already on record                  → log in
//  Case B  email matches an existing account           → link GitHub to it
//  Case C  no match                                    → create new account
// ---------------------------------------------------------------------------

export async function handleGitHubCallback(req: Request, res: Response) {
  const { code, error, state } = req.query;

  // Decode the state param to recover the optional ?next= value
  let nextPath: string | null = null;
  if (typeof state === "string") {
    try {
      const decoded = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8"),
      );
      if (typeof decoded.next === "string" && decoded.next.startsWith("/")) {
        nextPath = decoded.next;
      }
    } catch {
      // Malformed state — ignore, continue without redirect
    }
  }

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/signin?error=github_denied`);
  }

  try {
    // 1. Exchange code → access token
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
      console.error("[GitHub OAuth] Token exchange failed:", tokenRes.data);
      return res.redirect(`${FRONTEND_URL}/signin?error=github_token`);
    }

    const ghHeaders = {
      Authorization: `Bearer ${ghAccessToken}`,
      Accept: "application/vnd.github+json",
    };

    // 2. Fetch profile + verified emails in parallel
    const [profileRes, emailsRes] = await Promise.all([
      axios.get<GitHubUser>("https://api.github.com/user", {
        headers: ghHeaders,
      }),
      axios.get<GitHubEmail[]>("https://api.github.com/user/emails", {
        headers: ghHeaders,
      }),
    ]);

    const profile = profileRes.data;
    const githubId = profile.id.toString();

    const primaryEmail =
      emailsRes.data.find((e) => e.primary && e.verified)?.email ??
      emailsRes.data.find((e) => e.verified)?.email ??
      profile.email;

    if (!primaryEmail) {
      return res.redirect(`${FRONTEND_URL}/signin?error=github_no_email`);
    }

    // 3. Find or create developer
    let developer = await prisma.developer.findFirst({
      where: { OR: [{ githubId }, { email: primaryEmail }] },
    });

    if (developer) {
      if (developer.githubId && developer.githubId !== githubId) {
        return res.redirect(`${FRONTEND_URL}/signin?error=github_conflict`);
      }

      const isFirstLink = !developer.githubId;

      let newAuthProvider = developer.authProvider;
      if (isFirstLink) {
        newAuthProvider = developer.passwordHash ? "both" : "github";
      }

      developer = await prisma.developer.update({
        where: { id: developer.id },
        data: {
          githubId,
          avatarUrl: developer.avatarUrl ?? profile.avatar_url,
          emailVerified: true,
          authProvider: newAuthProvider,
        },
      });
    } else {
      // Case C: brand-new developer via GitHub
      const desiredUsername = profile.login
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      const usernameTaken = await prisma.developer.findUnique({
        where: { username: desiredUsername },
      });

      developer = await prisma.developer.create({
        data: {
          email: primaryEmail,
          fullName: profile.name ?? null,
          username: usernameTaken ? null : desiredUsername,
          avatarUrl: profile.avatar_url,
          githubId,
          authProvider: "github",
          emailVerified: true,
          passwordHash: null,
        },
      });
    }

    // 4. Issue tokens — set httpOnly refresh cookie
    const tokens = await issueTokens(
      { type: "developer", id: developer.id },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    // 5. Redirect with access token in URL fragment.
    //    Append next= as a query param on the callback page so the frontend
    //    can redirect after it has stored the token.
    const callbackUrl = new URL(`${FRONTEND_URL}/oauth/callback`);
    callbackUrl.hash = `token=${tokens.accessToken}`;
    if (nextPath) {
      // Pass next as a query param alongside the fragment
      callbackUrl.searchParams.set("next", nextPath);
    }

    return res.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("[GitHub OAuth] Callback error:", err);
    return res.redirect(`${FRONTEND_URL}/signin?error=github_failed`);
  }
}
