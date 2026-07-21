import type { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRY_DEFAULT = "15m";
const REFRESH_TOKEN_EXPIRY_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000; // 30 days

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === "production";
const SAME_SITE: "none" | "lax" = IS_PROD ? "none" : "lax";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionOwner =
  | { type: "developer"; id: string }
  | {
      type: "endUser";
      id: string;
      // Required for end-user sessions — stored on the Session row so we can
      // validate project context and revoke all sessions for a project without
      // a join through EndUser.
      projectId: string;
    };

// What gets embedded in the JWT payload.
// Developer tokens never carry projectId.
// End-user tokens always carry projectId.
export type TokenPayload =
  | { type: "developer"; id: string }
  | { type: "endUser"; id: string; projectId: string };

// ---------------------------------------------------------------------------
// Cookie helpers — only used for developer console sessions
// ---------------------------------------------------------------------------

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SAME_SITE,
    maxAge: REFRESH_TOKEN_EXPIRY_MS_DEFAULT,
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

function generateAccessToken(
  owner: SessionOwner,
  expirySeconds?: number,
): string {
  const payload: TokenPayload =
    owner.type === "developer"
      ? { type: "developer", id: owner.id }
      : { type: "endUser", id: owner.id, projectId: owner.projectId };

  const expiresIn = expirySeconds
    ? (`${expirySeconds}s` as const)
    : ACCESS_TOKEN_EXPIRY_DEFAULT;

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn,
  } as jwt.SignOptions);
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Returns the SHA-256 hex digest of a token string.
 * We store this in session.token instead of the raw JWT so that a database
 * breach does not hand attackers valid bearer tokens.
 * The original token is still returned to the caller — this is one-way.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ownerClause(owner: SessionOwner) {
  if (owner.type === "developer") {
    return { developerId: owner.id };
  }
  return { endUserId: owner.id, projectId: owner.projectId };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Issues a new access + refresh token pair, persists the session, and
 * (for developer sessions) sets the httpOnly refresh-token cookie.
 *
 * For end-user SDK sessions, the refresh token is returned in the response
 * body by the SDK controller — not set as a cookie — because the SDK runs
 * on a different origin from the developer console.
 *
 * @param owner      Who the session belongs to.
 * @param res        Express response object (used to set cookie for developers).
 * @param meta       Optional IP + user agent for audit purposes.
 * @param settings   Optional per-project session config (duration overrides).
 */
export async function issueTokens(
  owner: SessionOwner,
  res: Response,
  meta?: { ipAddress?: string; userAgent?: string },
  settings?: { sessionDurationDays?: number; jwtDurationSeconds?: number },
): Promise<{ accessToken: string; refreshToken: string }> {
  const jwtSeconds = settings?.jwtDurationSeconds ?? undefined;
  const sessionMs = (settings?.sessionDurationDays ?? 30) * 24 * 60 * 60 * 1000;

  const accessToken = generateAccessToken(owner, jwtSeconds);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + sessionMs);

  // Store a SHA-256 hash of the access token — never the raw JWT.
  // The raw token is returned to the caller but must never be persisted
  // in plaintext; a DB breach must not yield valid bearer tokens.
  const tokenHash = hashToken(accessToken);

  await prisma.session.create({
    data: {
      ...ownerClause(owner),
      token: tokenHash,
      refreshToken,
      expiresAt,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  // Only set the cookie for developer console sessions.
  // SDK (end-user) sessions return the token in the response body.
  if (owner.type === "developer") {
    setRefreshTokenCookie(res, refreshToken);
  }

  return { accessToken, refreshToken };
}

/**
 * Rotates a refresh token: validates the old token, deletes the old session,
 * and issues a fresh pair. Returns null if the token is invalid or expired.
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
    // Do NOT clear cookies here — the session may simply not be found due
    // to a race condition after login. Clearing would immediately log the
    // developer out.
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    if (session.developerId) clearAuthCookies(res);
    return null;
  }

  const owner: SessionOwner = session.developerId
    ? { type: "developer", id: session.developerId }
    : {
        type: "endUser",
        id: session.endUserId!,
        projectId: session.projectId!,
      };

  await prisma.session.delete({ where: { id: session.id } });

  return issueTokens(owner, res, meta);
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

export async function revokeAllSessions(owner: SessionOwner): Promise<void> {
  await prisma.session.deleteMany({ where: ownerClause(owner) });
}

/**
 * Revokes all active sessions for every end user in a project.
 * Called when a developer deletes a project or revokes all access.
 */
export async function revokeAllProjectSessions(
  projectId: string,
): Promise<void> {
  await prisma.session.deleteMany({ where: { projectId } });
}

/**
 * Verifies a JWT access token. Returns the typed payload or null.
 * Always check `payload.type` before using — developer and end-user
 * tokens must never be accepted interchangeably.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Type guard — ensures the token payload belongs to a developer.
 * Use in developer console middleware.
 */
export function isDeveloperPayload(
  payload: TokenPayload,
): payload is { type: "developer"; id: string } {
  return payload.type === "developer";
}

/**
 * Type guard — ensures the token payload belongs to an end user.
 * Use in SDK middleware.
 */
export function isEndUserPayload(
  payload: TokenPayload,
): payload is { type: "endUser"; id: string; projectId: string } {
  return payload.type === "endUser";
}
