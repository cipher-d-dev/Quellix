import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import { revokeAllSessions } from "../../utils/generateToken.ts";
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

function safeUser(u: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  externalId: string | null;
  metadata: unknown;
  banned: boolean;
  lastSignInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
    banned: u.banned,
    lastSignInAt: u.lastSignInAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// ── PUBLISHABLE KEY ROUTES (end user operates on their own account) ─────────
// ---------------------------------------------------------------------------

// GET /sdk/user/me
// Returns the authenticated end user's profile.
// Requires: publishable key + access token

export async function getMe(req: Request, res: Response) {
  try {
    return res.status(200).json({
      success: true,
      data: { user: safeUser(req.endUser!) },
    });
  } catch (error) {
    console.error("[sdk/user/me GET]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// PATCH /sdk/user/me
// Updates the authenticated end user's profile fields.
// Requires: publishable key + access token
// Body: { firstName?, lastName?, profileImageUrl?, metadata? }
// Note: email changes are not allowed here — that requires a verification
// flow (Phase 4). password changes are also Phase 4.

export async function updateMe(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const { firstName, lastName, profileImageUrl } = req.body;

    // Reject attempts to change email or password through this endpoint
    if (req.body.email) {
      return res.status(400).json({
        success: false,
        error:
          "Email changes require a verification flow. Use /sdk/auth/email/change.",
      });
    }
    if (req.body.password || req.body.newPassword) {
      return res.status(400).json({
        success: false,
        error:
          "Password changes are not allowed through this endpoint. Use /sdk/auth/password/change.",
      });
    }

    const updated = await prisma.endUser.update({
      where: { id: endUser.id },
      data: {
        ...(firstName !== undefined
          ? { firstName: firstName?.trim() ?? null }
          : {}),
        ...(lastName !== undefined
          ? { lastName: lastName?.trim() ?? null }
          : {}),
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
      },
    });

    return res.status(200).json({
      success: true,
      data: { user: safeUser(updated) },
    });
  } catch (error) {
    console.error("[sdk/user/me PATCH]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// DELETE /sdk/user/me
// Deletes the authenticated end user's account and all their sessions.
// Requires: publishable key + access token
// Body: { password } — must confirm with password to prevent accidents

export async function deleteMe(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Your current password is required to delete your account.",
      });
    }

    if (!endUser.passwordHash) {
      return res.status(400).json({
        success: false,
        error:
          "Account deletion requires a password. This account uses social sign-in only.",
      });
    }

    const valid = await argon2.verify(endUser.passwordHash, password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Incorrect password.",
      });
    }

    logAuthEvent({
      type: "account_deleted",
      projectId: req.sdkProject!.id,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    // Prisma cascade handles sessions, socialAccounts, etc.
    await prisma.endUser.delete({ where: { id: endUser.id } });

    return res.status(200).json({
      success: true,
      message: "Account deleted.",
    });
  } catch (error) {
    console.error("[sdk/user/me DELETE]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// ── SECRET KEY ROUTES (developer's backend manages users) ───────────────────
// ---------------------------------------------------------------------------

// GET /sdk/users
// Lists all end users for the project with cursor-based pagination.
// Requires: secret key
// Query: { limit?, cursor?, email?, banned? }

export async function listUsers(req: Request, res: Response) {
  try {
    const projectId = req.sdkProject!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const cursor = req.query.cursor as string | undefined;
    const email = req.query.email as string | undefined;
    const banned =
      req.query.banned !== undefined ? req.query.banned === "true" : undefined;

    const users = await prisma.endUser.findMany({
      where: {
        projectId,
        ...(email ? { email: { contains: email, mode: "insensitive" } } : {}),
        ...(banned !== undefined ? { banned } : {}),
      },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasNextPage = users.length > limit;
    const page = hasNextPage ? users.slice(0, limit) : users;
    const nextCursor = hasNextPage ? page[page.length - 1].id : null;

    return res.status(200).json({
      success: true,
      data: {
        users: page.map(safeUser),
        nextCursor,
        hasNextPage,
      },
    });
  } catch (error) {
    console.error("[sdk/users GET]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// GET /sdk/users/:id
// Returns a single end user by ID.
// Requires: secret key

export async function getUser(req: Request, res: Response) {
  try {
    const projectId = req.sdkProject!.id;
    const { id } = req.params;

    const endUser = await prisma.endUser.findUnique({ where: { id: id as string } });

    if (!endUser || endUser.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    return res.status(200).json({
      success: true,
      data: { user: safeUser(endUser) },
    });
  } catch (error) {
    console.error("[sdk/users/:id GET]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// PATCH /sdk/users/:id
// Updates a user's profile, metadata, externalId, or banned status.
// This is the admin override — no password required.
// Requires: secret key
// Body: { firstName?, lastName?, profileImageUrl?, metadata?,
//         externalId?, banned?, emailVerified? }

export async function updateUser(req: Request, res: Response) {
  try {
    const projectId = req.sdkProject!.id;
    const { id } = req.params;

    const endUser = await prisma.endUser.findUnique({ where: { id: id as string } });
    if (!endUser || endUser.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const {
      firstName,
      lastName,
      profileImageUrl,
      metadata,
      externalId,
      banned,
      emailVerified,
    } = req.body;

    // If banning, revoke all their sessions immediately
    if (banned === true && !endUser.banned) {
      await revokeAllSessions({ type: "endUser", id: endUser.id, projectId });
      logAuthEvent({
        type: "user_banned",
        projectId,
        endUserId: endUser.id,
        ...clientMeta(req),
      });
    }

    const updated = await prisma.endUser.update({
      where: { id: id as string },
      data: {
        ...(firstName !== undefined
          ? { firstName: firstName?.trim() ?? null }
          : {}),
        ...(lastName !== undefined
          ? { lastName: lastName?.trim() ?? null }
          : {}),
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        ...(externalId !== undefined ? { externalId: externalId ?? null } : {}),
        ...(banned !== undefined ? { banned } : {}),
        ...(emailVerified !== undefined ? { emailVerified } : {}),
      },
    });

    return res.status(200).json({
      success: true,
      data: { user: safeUser(updated) },
    });
  } catch (error) {
    console.error("[sdk/users/:id PATCH]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// DELETE /sdk/users/:id
// Hard-deletes an end user and all their data. Irreversible.
// Requires: secret key

export async function deleteUser(req: Request, res: Response) {
  try {
    const projectId = req.sdkProject!.id;
    const { id } = req.params;

    const endUser = await prisma.endUser.findUnique({ where: { id: id as string } });
    if (!endUser || endUser.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    logAuthEvent({
      type: "user_deleted_by_admin",
      projectId,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    await prisma.endUser.delete({ where: { id: id as string } });

    return res.status(200).json({ success: true, message: "User deleted." });
  } catch (error) {
    console.error("[sdk/users/:id DELETE]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// DELETE /sdk/users/:id/sessions
// Revokes all active sessions for a user — forces them to sign in again
// on all devices. Use this when a user reports a stolen device.
// Requires: secret key

export async function revokeUserSessions(req: Request, res: Response) {
  try {
    const projectId = req.sdkProject!.id;
    const { id } = req.params;

    const endUser = await prisma.endUser.findUnique({ where: { id: id as string } });
    if (!endUser || endUser.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const { count } = await prisma.session.deleteMany({
      where: { endUserId: id as string, projectId },
    });

    logAuthEvent({
      type: "sessions_revoked_by_admin",
      projectId,
      endUserId: id as string,
      ...clientMeta(req),
      metadata: { sessionsRevoked: count },
    });

    return res.status(200).json({
      success: true,
      message: `${count} session${count !== 1 ? "s" : ""} revoked.`,
      data: { count },
    });
  } catch (error) {
    console.error("[sdk/users/:id/sessions DELETE]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
