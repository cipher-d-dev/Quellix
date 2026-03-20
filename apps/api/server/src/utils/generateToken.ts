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
// Types
// ---------------------------------------------------------------------------

type SessionOwner =
  | { type: "developer"; id: string }
  | { type: "endUser"; id: string };

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === "production";

// In production the frontend and backend are on different domains, so cookies
// must be SameSite=None + Secure to be sent cross-origin. In development
// both run on localhost so Lax is fine and Secure is not required.
const SAME_SITE = IS_PROD ? "none" : "lax";

function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: IS_PROD, // required when SameSite=None
    sameSite: SAME_SITE,
    maxAge: 15 * 60 * 1000,
    path: "/",
  });
}

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: IS_PROD, // required when SameSite=None
    sameSite: SAME_SITE,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/", // ← was "/auth/refresh", too restrictive
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SAME_SITE,
    path: "/",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SAME_SITE,
    path: "/", // ← must match what was set
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
  // Opaque random token — not a JWT so it can be fully revoked by
  // deleting the session row, no blacklist needed
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

/**
 * Issue a new access + refresh token pair, persist the session, set cookies.
 * Called on login and register for both developers and end users.
 */
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

/**
 * Rotate tokens — validate the incoming refresh token, delete the old
 * session, issue a new pair. Returns null if invalid or expired.
 */
export async function rotateTokens(
  incomingRefreshToken: string,
  res: Response,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const session = await prisma.session.findUnique({
    where: { refreshToken: incomingRefreshToken },
  });

  if (!session) {
    clearAuthCookies(res);
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    clearAuthCookies(res);
    return null;
  }

  // Determine owner from whichever FK is set
  const owner: SessionOwner = session.developerId
    ? { type: "developer", id: session.developerId }
    : { type: "endUser", id: session.endUserId! };

  // Delete old session before issuing new one — prevents replay attacks
  await prisma.session.delete({ where: { id: session.id } });

  return issueTokens(owner, res, meta);
}

/**
 * Revoke a single session by its refresh token.
 * Called on logout.
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

/**
 * Revoke all sessions for a given owner.
 * Called after password reset so any attacker who triggered the reset
 * can't stay logged in.
 */
export async function revokeAllSessions(owner: SessionOwner): Promise<void> {
  await prisma.session.deleteMany({ where: ownerClause(owner) });
}

/**
 * Verify an access token and return its payload.
 * Returns null if the token is invalid or expired.
 */
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
