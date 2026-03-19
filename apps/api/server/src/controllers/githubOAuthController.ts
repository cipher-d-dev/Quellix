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
// ---------------------------------------------------------------------------

export function redirectToGitHub(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
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
//          GitHub has verified the email, so auto-merge is safe.
//          authProvider is set depending on what was already there:
//            - had password only    → "both"
//            - had no password      → "github"
//            - already "both"       → stays "both"
//  Case C  no match                                    → create new account
// ---------------------------------------------------------------------------

export async function handleGitHubCallback(req: Request, res: Response) {
  const { code, error } = req.query;

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
        // A different GitHub account is already linked to this email
        return res.redirect(`${FRONTEND_URL}/signin?error=github_conflict`);
      }

      const isFirstLink = !developer.githubId;

      // Derive the correct authProvider value:
      //   already "both"           → keep "both"
      //   first link + has pass    → "both"  (they had email, now also github)
      //   first link + no pass     → "github"
      //   already "github"         → stay "github"
      let newAuthProvider = developer.authProvider;
      if (isFirstLink) {
        newAuthProvider = developer.passwordHash ? "both" : "github";
      }

      developer = await prisma.developer.update({
        where: { id: developer.id },
        data: {
          githubId,
          // Preserve a custom avatar the user may have set
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

    // 4. Issue tokens and set httpOnly refresh cookie
    const tokens = await issueTokens(
      { type: "developer", id: developer.id },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    // 5. Redirect with access token in URL fragment — never sent in request
    //    headers, never stored by the browser beyond the current page load.
    return res.redirect(
      `${FRONTEND_URL}/oauth/callback#token=${tokens.accessToken}`,
    );
  } catch (err) {
    console.error("[GitHub OAuth] Callback error:", err);
    return res.redirect(`${FRONTEND_URL}/signin?error=github_failed`);
  }
}
