import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  generateVerificationCode,
  sendEmailChangeCode,
} from "../../utils/mailer.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_CHANGE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

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

function appName(req: Request): string | undefined {
  return req.sdkProject?.name ?? undefined;
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/password/change
//
// Allows an authenticated end user to change their own password.
// Requires: publishable key + valid access token
// Body: { currentPassword, newPassword }
//
// On success: password is updated and all OTHER sessions are revoked
// (the current session is preserved so the user stays logged in on this device).
// ---------------------------------------------------------------------------

export async function changePassword(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const project = req.sdkProject!;
    const settings = project.settings;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "currentPassword and newPassword are required.",
      });
    }

    // Guard: social-sign-in only accounts cannot use this endpoint
    if (!endUser.passwordHash) {
      return res.status(400).json({
        success: false,
        error:
          "This account was created with social sign-in and has no password. Use the forgot password flow to set one.",
      });
    }

    // Verify the current password
    const valid = await argon2.verify(endUser.passwordHash, currentPassword);
    if (!valid) {
      logAuthEvent({
        type: "password_change_failed",
        projectId: project.id,
        endUserId: endUser.id,
        ...clientMeta(req),
        metadata: { reason: "wrong_current_password" },
      });
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect.",
      });
    }

    // Prevent reuse of the same password
    const isSame = await argon2.verify(endUser.passwordHash, newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        error: "New password must be different from your current password.",
      });
    }

    // ── Password policy ────────────────────────────────────────────────────
    if (settings) {
      const min = settings.passwordMinLength;
      if (newPassword.length < min) {
        return res.status(400).json({
          success: false,
          error: `Password must be at least ${min} characters.`,
        });
      }
      if (settings.passwordRequireUppercase && !/[A-Z]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one uppercase letter.",
        });
      }
      if (settings.passwordRequireNumber && !/\d/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one number.",
        });
      }
      if (
        settings.passwordRequireSymbol &&
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one special character.",
        });
      }
    }

    const newHash = await argon2.hash(newPassword);

    // Extract the current session's refresh token from the Authorization
    // header so we can keep it alive while revoking everything else.
    // The access token identifies the session via its token column.
    const accessToken = req.headers.authorization!.slice(7);

    await prisma.$transaction([
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { passwordHash: newHash },
      }),
      // Revoke all sessions except the current one — keeps the user logged
      // in on this device while forcing re-login everywhere else.
      prisma.session.deleteMany({
        where: {
          endUserId: endUser.id,
          token: { not: accessToken },
        },
      }),
    ]);

    logAuthEvent({
      type: "password_changed",
      projectId: project.id,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    return res.status(200).json({
      success: true,
      message: "Password updated. Other active sessions have been signed out.",
    });
  } catch (error) {
    console.error("[sdk/password/change]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/email/change
//
// Step 1 of the email-change flow. Sends a verification code to the
// NEW email address to prove inbox ownership before swapping.
//
// Requires: publishable key + valid access token
// Body: { newEmail }
//
// Security design:
//   - The current email does NOT change until /email/change/confirm is called.
//   - The new email is stored as endUser.pendingEmail until confirmed.
//   - If another user in the project already owns newEmail, we reject early.
//   - Rate-limited to one request per 60 seconds.
// ---------------------------------------------------------------------------

export async function requestEmailChange(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const project = req.sdkProject!;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        error: "newEmail is required.",
      });
    }

    const normalizedNew = newEmail.trim().toLowerCase();

    // Must actually be different
    if (normalizedNew === endUser.email) {
      return res.status(400).json({
        success: false,
        error: "New email must be different from your current email.",
      });
    }

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNew)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    // Check the new email is not already taken by another user in this project
    const conflict = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedNew },
      },
      select: { id: true },
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        error: "That email address is already in use.",
      });
    }

    // Rate-limit: one request per 60 seconds
    const recent = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        type: "EMAIL_CHANGE",
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      const secondsLeft = Math.ceil(
        (recent.createdAt.getTime() + 60_000 - Date.now()) / 1000,
      );
      return res.status(429).json({
        success: false,
        error: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} before requesting another code.`,
      });
    }

    // Rotate: delete any previous EMAIL_CHANGE token for this user
    await prisma.verificationToken.deleteMany({
      where: { endUserId: endUser.id, type: "EMAIL_CHANGE" },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MS);

    // Persist the pending email and the token atomically
    await prisma.$transaction([
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { pendingEmail: normalizedNew },
      }),
      prisma.verificationToken.create({
        data: {
          endUserId: endUser.id,
          token: code,
          type: "EMAIL_CHANGE",
          expiresAt,
        },
      }),
    ]);

    // Fire-and-forget — mail failure must not block the response
    sendEmailChangeCode(normalizedNew, code, { appName: appName(req) }).catch(
      (e) => console.error("[sdk/email/change] mailer error:", e),
    );

    logAuthEvent({
      type: "email_change_requested",
      projectId: project.id,
      endUserId: endUser.id,
      ...clientMeta(req),
      metadata: { newEmail: normalizedNew },
    });

    return res.status(200).json({
      success: true,
      message: `A verification code has been sent to ${normalizedNew}. Enter it to complete the change.`,
    });
  } catch (error) {
    console.error("[sdk/email/change]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/email/change/confirm
//
// Step 2 of the email-change flow. Validates the code sent to the new email
// and atomically swaps endUser.email → endUser.pendingEmail.
//
// Requires: publishable key + valid access token
// Body: { code }
//
// On success: all sessions are revoked (the email is the identity anchor —
// changing it is equivalent to changing credentials). The user must sign in
// again with the new email.
// ---------------------------------------------------------------------------

export async function confirmEmailChange(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const project = req.sdkProject!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "code is required.",
      });
    }

    // Guard: no pending email means no change was requested
    if (!endUser.pendingEmail) {
      return res.status(400).json({
        success: false,
        error:
          "No email change is pending. Call /sdk/auth/email/change first.",
      });
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        token: code.trim(),
        type: "EMAIL_CHANGE",
      },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code.",
      });
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      // Also clear the stale pendingEmail
      await prisma.endUser.update({
        where: { id: endUser.id },
        data: { pendingEmail: null },
      });
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Request a new one.",
        code: "CODE_EXPIRED",
      });
    }

    // Double-check the new email is still available (race condition guard)
    const conflict = await prisma.endUser.findUnique({
      where: {
        projectId_email: {
          projectId: project.id,
          email: endUser.pendingEmail,
        },
      },
      select: { id: true },
    });
    if (conflict) {
      // Clean up and abort
      await prisma.$transaction([
        prisma.endUser.update({
          where: { id: endUser.id },
          data: { pendingEmail: null },
        }),
        prisma.verificationToken.delete({ where: { id: record.id } }),
      ]);
      return res.status(409).json({
        success: false,
        error:
          "That email address was taken while you were confirming. Please start the email change again.",
      });
    }

    const newEmail = endUser.pendingEmail;

    // Swap email, clear pendingEmail, delete token, and revoke all sessions
    // in a single transaction. The user must sign in again with the new email.
    await prisma.$transaction([
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { email: newEmail, pendingEmail: null },
      }),
      prisma.verificationToken.delete({ where: { id: record.id } }),
      prisma.session.deleteMany({ where: { endUserId: endUser.id } }),
    ]);

    logAuthEvent({
      type: "email_changed",
      projectId: project.id,
      endUserId: endUser.id,
      ...clientMeta(req),
      metadata: { newEmail },
    });

    return res.status(200).json({
      success: true,
      message:
        "Email address updated. Please sign in again with your new email.",
    });
  } catch (error) {
    console.error("[sdk/email/change/confirm]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
