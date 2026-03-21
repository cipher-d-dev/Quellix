import type { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}

// ---------------------------------------------------------------------------
// Cookie config
//
// Rules:
//   - Same domain (frontend + backend on same domain/subdomain): SameSite=Lax, Secure=true in prod
//   - Cross-origin (different domains): SameSite=None, Secure=true (HTTPS required)
//   - Localhost dev: SameSite=Lax, Secure=false
//
// We derive this from NODE_ENV. Make sure NODE_ENV is explicitly set in your
// deployment environment variables — don't rely on defaults.
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === "production";

// Log on startup so you can verify the cookie config being used
console.log(
  `[auth] Cookie config: NODE_ENV=${process.env.NODE_ENV} IS_PROD=${IS_PROD} ` +
    `SameSite=${IS_PROD ? "none" : "lax"} Secure=${IS_PROD}`,
);

const SAME_SITE: "none" | "lax" = IS_PROD ? "none" : "lax";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionOwner =
  | { type: "developer"; id: string }
  | { type: "endUser"; id: string };

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SAME_SITE,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/",
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SAME_SITE,
    path: "/",
  });
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

function generateAccessToken(owner: SessionOwner): string {
  return jwt.sign({ id: owner.id, type: owner.type }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function ownerClause(owner: SessionOwner) {
  return owner.type === "developer"
    ? { developerId: owner.id }
    : { endUserId: owner.id };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function issueTokens(
  owner: SessionOwner,
  res: Response,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken(owner);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await prisma.session.create({
    data: {
      ...ownerClause(owner),
      token: accessToken,
      refreshToken,
      expiresAt,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  setRefreshTokenCookie(res, refreshToken);

  return { accessToken, refreshToken };
}

export async function rotateTokens(
  incomingRefreshToken: string,
  res: Response,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const session = await prisma.session.findUnique({
    where: { refreshToken: incomingRefreshToken },
  });

  if (!session) {
    // Do NOT call clearAuthCookies here. The session may simply not be found
    // due to a race condition (e.g. the refresh call fired before the session
    // was committed after login), or the token may belong to a different
    // session store. Clearing the cookie here would log the user out
    // immediately after a successful login.
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    clearAuthCookies(res);
    return null;
  }

  const owner: SessionOwner = session.developerId
    ? { type: "developer", id: session.developerId }
    : { type: "endUser", id: session.endUserId! };

  await prisma.session.delete({ where: { id: session.id } });

  return issueTokens(owner, res, meta);
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

export async function revokeAllSessions(owner: SessionOwner): Promise<void> {
  await prisma.session.deleteMany({ where: ownerClause(owner) });
}

export function verifyAccessToken(
  token: string,
): { id: string; type: "developer" | "endUser" } | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as {
      id: string;
      type: "developer" | "endUser";
    };
  } catch {
    return null;
  }
}
