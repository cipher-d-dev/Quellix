import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  issueTokens,
  revokeSession,
  rotateTokens,
  verifyAccessToken,
  isEndUserPayload,
} from "../../utils/generateToken.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

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
      return res.status(403).json({
        success: false,
        error: "New registrations are currently disabled for this application.",
      });
    }

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Password policy ────────────────────────────────────────────────────
    if (settings) {
      const min = settings.passwordMinLength;
      if (password.length < min) {
        return res.status(400).json({
          success: false,
          error: `Password must be at least ${min} characters.`,
        });
      }
      if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one uppercase letter.",
        });
      }
      if (settings.passwordRequireNumber && !/\d/.test(password)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one number.",
        });
      }
      if (settings.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one special character.",
        });
      }
    }

    // ── Duplicate check ────────────────────────────────────────────────────
    const existing = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedEmail },
      },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
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
      },
    );

    logAuthEvent({
      type: "register",
      projectId: project.id,
      endUserId: endUser.id,
      ...meta,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: safeUser(endUser),
        accessToken,
        refreshToken,
        // Let the SDK know whether it needs to prompt for email verification
        emailVerificationRequired: settings?.requireEmailVerification ?? false,
      },
    });
  } catch (error) {
    console.error("[sdk/register]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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
      return res.status(400).json({
        success: false,
        error: "email and password are required.",
      });
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
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    if (endUser.banned) {
      return res.status(403).json({
        success: false,
        error:
          "Your account has been suspended. Contact the application owner.",
      });
    }

    // ── Email verification gate ────────────────────────────────────────────
    if (settings?.requireEmailVerification && !endUser.emailVerified) {
      return res.status(403).json({
        success: false,
        error: "Please verify your email address before signing in.",
        code: "EMAIL_NOT_VERIFIED",
      });
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
    const { accessToken, refreshToken } = await issueTokens(
      { type: "endUser", id: endUser.id, projectId: project.id },
      res,
      meta,
      {
        sessionDurationDays: settings?.sessionDurationDays,
        jwtDurationSeconds: settings?.jwtDurationSeconds,
      },
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

    return res.status(200).json({
      success: true,
      data: {
        user: safeUser(endUser),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("[sdk/signin]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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

    return res.status(200).json({ success: true, message: "Signed out." });
  } catch (error) {
    console.error("[sdk/signout]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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
      return res.status(400).json({
        success: false,
        error: "refreshToken is required.",
      });
    }

    const result = await rotateTokens(refreshToken, res, clientMeta(req));

    if (!result) {
      return res.status(401).json({
        success: false,
        error: "Refresh token is invalid or has expired. Please sign in again.",
        code: "SESSION_EXPIRED",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    console.error("[sdk/refresh]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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

    return res.status(200).json({
      success: true,
      data: {
        user: safeUser(endUser),
      },
    });
  } catch (error) {
    console.error("[sdk/session]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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
      return res.status(400).json({
        success: false,
        error: "token is required.",
      });
    }

    const payload = verifyAccessToken(token);

    if (!payload || !isEndUserPayload(payload)) {
      return res.status(401).json({
        success: false,
        error: "Token is invalid or expired.",
        valid: false,
      });
    }

    // Ensure the token belongs to this project
    if (payload.projectId !== req.sdkProject!.id) {
      return res.status(401).json({
        success: false,
        error: "Token does not belong to this project.",
        valid: false,
      });
    }

    // Fetch fresh user data — the token may be valid but the account banned
    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.id },
    });

    if (!endUser || endUser.banned) {
      return res.status(401).json({
        success: false,
        error: endUser?.banned ? "Account suspended." : "User not found.",
        valid: false,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        user: safeUser(endUser),
      },
    });
  } catch (error) {
    console.error("[sdk/verify]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
