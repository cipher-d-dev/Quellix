import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  issueTokens,
  revokeSession,
  rotateTokens,
  verifyAccessToken,
  isEndUserPayload,
  hashToken,
} from "../../utils/generateToken.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";
import {
  sendSuccess,
  sendError,
  handleError,
} from "../../utils/apiResponse.ts";
import { SdkErrorCode } from "../../constants/errorCodes.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clientMeta(req: Request) {
  return {
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
      req.socket.remoteAddress ??
      undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
  };
}

/** Strips sensitive fields before returning an end user object to the SDK. */
function safeUser(u: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  banned: boolean;
  externalId: string | null;
  metadata: unknown;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
    emailVerified: u.emailVerified,
    externalId: u.externalId,
    metadata: u.metadata,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function getProjectSettings(req: Request) {
  return req.sdkProject?.settings ?? null;
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/register
//
// Registers a new end user for the project.
// Requires: publishable key
// Body: { email, password, firstName?, lastName? }
// ---------------------------------------------------------------------------

export async function register(req: Request, res: Response) {
  try {
    const project = req.sdkProject!;
    const settings = getProjectSettings(req);

    // ── Check signups allowed ──────────────────────────────────────────────
    if (settings && !settings.allowSignups) {
      return sendError(
        res,
        "New registrations are currently disabled for this application.",
        SdkErrorCode.FORBIDDEN,
        403
      );
    }

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        "email and password are required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Password policy ────────────────────────────────────────────────────
    if (settings) {
      const min = settings.passwordMinLength;
      if (password.length < min) {
        return sendError(
          res,
          `Password must be at least ${min} characters.`,
          SdkErrorCode.WEAK_PASSWORD,
          400
        );
      }
      if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
        return sendError(
          res,
          "Password must contain at least one uppercase letter.",
          SdkErrorCode.WEAK_PASSWORD,
          400
        );
      }
      if (settings.passwordRequireNumber && !/\d/.test(password)) {
        return sendError(
          res,
          "Password must contain at least one number.",
          SdkErrorCode.WEAK_PASSWORD,
          400
        );
      }
      if (settings.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
        return sendError(
          res,
          "Password must contain at least one special character.",
          SdkErrorCode.WEAK_PASSWORD,
          400
        );
      }
    }

    // ── Duplicate check ────────────────────────────────────────────────────
    const existing = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedEmail },
      },
    });
    if (existing) {
      return sendError(
        res,
        "An account with this email already exists.",
        SdkErrorCode.EMAIL_ALREADY_EXISTS,
        409
      );
    }

    // ── Hash password + create user ────────────────────────────────────────
    const passwordHash = await argon2.hash(password);

    const endUser = await prisma.endUser.create({
      data: {
        projectId: project.id,
        email: normalizedEmail,
        passwordHash,
        firstName: firstName?.trim() ?? null,
        lastName: lastName?.trim() ?? null,
        lastSignInAt: new Date(),
      },
    });

    // ── Issue session ──────────────────────────────────────────────────────
    const meta = clientMeta(req);
    const { accessToken, refreshToken } = await issueTokens(
      { type: "endUser", id: endUser.id, projectId: project.id },
      res,
      meta,
      {
        sessionDurationDays: settings?.sessionDurationDays,
        jwtDurationSeconds: settings?.jwtDurationSeconds,
      }
    );

    logAuthEvent({
      type: "register",
      projectId: project.id,
      endUserId: endUser.id,
      ...meta,
    });

    return sendSuccess(
      res,
      {
        user: safeUser(endUser),
        accessToken,
        refreshToken,
        emailVerificationRequired: settings?.requireEmailVerification ?? false,
      },
      201
    );
  } catch (error) {
    return handleError(res, error, "[sdk/register]");
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/signin
//
// Signs in an existing end user.
// Requires: publishable key
// Body: { email, password }
// ---------------------------------------------------------------------------

export async function signin(req: Request, res: Response) {
  try {
    const project = req.sdkProject!;
    const settings = getProjectSettings(req);

    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(
        res,
        "email and password are required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const endUser = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedEmail },
      },
    });

    // Consistent timing: always verify even on not-found to prevent
    // user enumeration via timing attacks
    const dummyHash =
      "$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhash";
    const passwordHash = endUser?.passwordHash ?? dummyHash;

    const valid = await argon2.verify(passwordHash, password);

    if (!endUser || !valid) {
      logAuthEvent({
        type: "signin_failed",
        projectId: project.id,
        ...clientMeta(req),
        metadata: {
          email: normalizedEmail,
          reason: !endUser ? "user_not_found" : "wrong_password",
        },
      });
      return sendError(
        res,
        "Invalid email or password.",
        SdkErrorCode.INVALID_CREDENTIALS,
        401
      );
    }

    if (endUser.banned) {
      return sendError(
        res,
        "Your account has been suspended. Contact the application owner.",
        SdkErrorCode.USER_BANNED,
        403
      );
    }

    // ── Email verification gate ────────────────────────────────────────────
    if (settings?.requireEmailVerification && !endUser.emailVerified) {
      return sendError(
        res,
        "Please verify your email address before signing in.",
        SdkErrorCode.EMAIL_NOT_VERIFIED,
        403
      );
    }

    // ── Max sessions enforcement ───────────────────────────────────────────
    if (settings?.maxSessionsPerUser) {
      const sessionCount = await prisma.session.count({
        where: { endUserId: endUser.id },
      });
      if (sessionCount >= settings.maxSessionsPerUser) {
        // Revoke the oldest session
        const oldest = await prisma.session.findFirst({
          where: { endUserId: endUser.id },
          orderBy: { createdAt: "asc" },
        });
        if (oldest) {
          await prisma.session.delete({ where: { id: oldest.id } });
        }
      }
    }

    const meta = clientMeta(req);

    // ── Check if 2FA is enabled ─────────────────────────────────────────────
    if (endUser.twoFactorEnabled) {
      const transientToken = jwt.sign(
        { type: "2fa_challenge", id: endUser.id, projectId: project.id },
        process.env.JWT_SECRET!,
        { expiresIn: "5m" }
      );
      
      await logAuthEvent({
        projectId: project.id,
        endUserId: endUser.id,
        type: "signin_2fa_pending",
        ...meta,
      });

      return sendSuccess(res, {
        status: "2fa_pending",
        2faToken: transientToken,
      });
    }

    const { accessToken, refreshToken } = await issueTokens(
      { type: "endUser", id: endUser.id, projectId: project.id },
      res,
      meta,
      {
        sessionDurationDays: settings?.sessionDurationDays,
        jwtDurationSeconds: settings?.jwtDurationSeconds,
      }
    );

    // Update lastSignInAt
    prisma.endUser
      .update({ where: { id: endUser.id }, data: { lastSignInAt: new Date() } })
      .catch(() => {});

    logAuthEvent({
      type: "signin",
      projectId: project.id,
      endUserId: endUser.id,
      ...meta,
    });

    return sendSuccess(res, {
      user: safeUser(endUser),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/signin]");
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/signout
//
// Revokes the current session.
// Requires: publishable key + end-user access token (via requireEndUserAuth)
// Body: { refreshToken }
// ---------------------------------------------------------------------------

export async function signout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    logAuthEvent({
      type: "signout",
      projectId: req.sdkProject!.id,
      endUserId: req.endUser?.id,
      ...clientMeta(req),
    });

    return sendSuccess(res, {});
  } catch (error) {
    return handleError(res, error, "[sdk/signout]");
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/refresh
//
// Exchanges a refresh token for a new access + refresh token pair.
// Requires: publishable key
// Body: { refreshToken }
//
// Rotation strategy: old refresh token is deleted, new pair issued.
// If the old token is already gone (replay attack), return 401.
// ---------------------------------------------------------------------------

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(
        res,
        "refreshToken is required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const result = await rotateTokens(refreshToken, res, clientMeta(req));

    if (!result) {
      return sendError(
        res,
        "Refresh token is invalid or has expired. Please sign in again.",
        SdkErrorCode.SESSION_EXPIRED,
        401
      );
    }

    return sendSuccess(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/refresh]");
  }
}

// ---------------------------------------------------------------------------
// GET /sdk/auth/session
//
// Verifies the current access token and returns the end user's profile.
// Requires: publishable key + end-user access token (via requireEndUserAuth)
//
// This is the endpoint the SDK calls on initialisation to restore session
// state — the equivalent of supabase.auth.getUser().
// ---------------------------------------------------------------------------

export async function getSession(req: Request, res: Response) {
  try {
    // requireEndUserAuth has already validated the token and attached endUser
    const endUser = req.endUser!;

    // Look up the session by the hash of the access token.
    // issueTokens() stores hashToken(accessToken) in session.token —
    // never the raw JWT — so we must hash before querying.
    const rawToken = req.headers.authorization?.slice(7) ?? "";
    const tokenHash = hashToken(rawToken);

    const session = await prisma.session.findFirst({
      where: { token: tokenHash },
    });

    const expiresAt = session?.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000);

    return sendSuccess(res, {
      user: safeUser(endUser),
      accessToken: rawToken,
      refreshToken: session?.refreshToken ?? "",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return handleError(res, error, "[sdk/session]");
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/token/verify
//
// Server-side token verification for secret key consumers.
// The developer's backend calls this to validate a user's access token
// without needing to share the JWT secret.
// Requires: secret key
// Body: { token }
// ---------------------------------------------------------------------------

export async function verifyToken(req: Request, res: Response) {
  try {
    const { token } = req.body;

    if (!token) {
      return sendError(
        res,
        "token is required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload || !isEndUserPayload(payload)) {
      return sendError(
        res,
        "Token is invalid or expired.",
        SdkErrorCode.INVALID_TOKEN,
        401
      );
    }

    // Ensure the token belongs to this project
    if (payload.projectId !== req.sdkProject!.id) {
      return sendError(
        res,
        "Token does not belong to this project.",
        SdkErrorCode.FORBIDDEN,
        401
      );
    }

    // Fetch fresh user data — the token may be valid but the account banned
    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.id },
    });

    if (!endUser || endUser.banned) {
      return sendError(
        res,
        endUser?.banned ? "Account suspended." : "User not found.",
        SdkErrorCode.USER_BANNED,
        401
      );
    }

    return sendSuccess(res, {
      valid: true,
      user: safeUser(endUser),
    });
  } catch (error) {
    return handleError(res, error, "[sdk/verify]");
  }
}
