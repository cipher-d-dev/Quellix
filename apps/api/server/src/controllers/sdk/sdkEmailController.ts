import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  generateVerificationCode,
  sendVerificationCode,
  sendPasswordResetCode,
} from "../../utils/mailer.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_VERIFICATION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const PASSWORD_RESET_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

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

/** App name from project settings — used in email copy. */
function appName(req: Request): string | undefined {
  return req.sdkProject?.name ?? undefined;
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/email/verify/send
//
// Sends a new email verification code to the authenticated end user.
// Requires: publishable key + access token
//
// Calling this when already verified is a no-op (returns 200 silently)
// so the SDK doesn't need to pre-check verified status before calling.
// ---------------------------------------------------------------------------

export async function sendEmailVerification(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;

    // Already verified — no-op
    if (endUser.emailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified.",
      });
    }

    // Delete any existing pending verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { endUserId: endUser.id, type: "EMAIL_VERIFICATION" },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);

    await prisma.verificationToken.create({
      data: {
        endUserId: endUser.id,
        token: code,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      },
    });

    // Fire-and-forget — email failure must not block the response
    sendVerificationCode("endUser", endUser.email, code, {
      appName: appName(req),
    }).catch((e) => console.error("[sdk/email/verify/send] mailer error:", e));

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${endUser.email}.`,
    });
  } catch (error) {
    console.error("[sdk/email/verify/send]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/email/verify/confirm
//
// Confirms email ownership using the code sent above.
// Requires: publishable key + access token
// Body: { code }
// ---------------------------------------------------------------------------

export async function confirmEmailVerification(req: Request, res: Response) {
  try {
    const endUser = req.endUser!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "code is required.",
      });
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        token: code.trim(),
        type: "EMAIL_VERIFICATION",
      },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code.",
      });
    }

    if (record.expiresAt < new Date()) {
      // Clean up the expired token
      await prisma.verificationToken.delete({ where: { id: record.id } });
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Request a new one.",
        code: "CODE_EXPIRED",
      });
    }

    // Mark verified + delete token in a transaction
    await prisma.$transaction([
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { emailVerified: true },
      }),
      prisma.verificationToken.delete({ where: { id: record.id } }),
    ]);

    logAuthEvent({
      type: "email_verified",
      projectId: req.sdkProject!.id,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    return res.status(200).json({
      success: true,
      message: "Email verified.",
    });
  } catch (error) {
    console.error("[sdk/email/verify/confirm]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/password/reset
//
// Initiates a password reset. Sends a code to the user's email.
// Requires: publishable key only — user is not signed in at this point
// Body: { email }
//
// Always returns 200 regardless of whether the email exists.
// This prevents user enumeration — an attacker cannot probe which
// emails are registered by checking whether a reset email arrives.
// ---------------------------------------------------------------------------

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const project = req.sdkProject!;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const endUser = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedEmail },
      },
    });

    // Always respond the same way — don't reveal whether the user exists
    if (!endUser || !endUser.passwordHash) {
      // No account or OAuth-only account — silent success
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a reset code has been sent.",
      });
    }

    if (endUser.banned) {
      // Banned users also get the silent success — no information leakage
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a reset code has been sent.",
      });
    }

    // Rate-limit: one reset request per user per 60 seconds
    const recent = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        type: "PASSWORD_RESET",
        // expiresAt is 10min from creation; if createdAt > now-60s it's recent
        // We approximate by checking if a token already exists with > 9min remaining
        expiresAt: {
          gt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS - 60_000),
        },
      },
    });

    if (recent) {
      // Still silent 200 — don't leak that the user exists
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a reset code has been sent.",
      });
    }

    // Invalidate any previous reset tokens
    await prisma.verificationToken.deleteMany({
      where: { endUserId: endUser.id, type: "PASSWORD_RESET" },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.verificationToken.create({
      data: {
        endUserId: endUser.id,
        token: code,
        type: "PASSWORD_RESET",
        expiresAt,
      },
    });

    sendPasswordResetCode("endUser", normalizedEmail, code, {
      appName: appName(req),
    }).catch((e) => console.error("[sdk/password/reset] mailer error:", e));

    logAuthEvent({
      type: "password_reset_requested",
      projectId: project.id,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("[sdk/password/reset]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /sdk/auth/password/reset/confirm
//
// Completes a password reset using the emailed code.
// Requires: publishable key only
// Body: { email, code, newPassword }
//
// On success: password is updated and ALL existing sessions are revoked.
// The user must sign in again on all devices — this is the correct
// security behaviour after a password reset.
// ---------------------------------------------------------------------------

export async function confirmPasswordReset(req: Request, res: Response) {
  try {
    const project = req.sdkProject!;
    const settings = project.settings;
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "email, code, and newPassword are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const endUser = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedEmail },
      },
    });

    if (!endUser) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code.",
      });
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        token: code.trim(),
        type: "PASSWORD_RESET",
      },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code.",
      });
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      return res.status(400).json({
        success: false,
        error: "Reset code has expired. Request a new one.",
        code: "CODE_EXPIRED",
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
      if (settings.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({
          success: false,
          error: "Password must contain at least one special character.",
        });
      }
    }

    const newHash = await argon2.hash(newPassword);

    // Update password, delete token, revoke all sessions — all in one transaction
    await prisma.$transaction([
      prisma.endUser.update({
        where: { id: endUser.id },
        data: { passwordHash: newHash },
      }),
      prisma.verificationToken.delete({ where: { id: record.id } }),
      // Revoke all sessions — forces sign-in on all devices after a reset
      prisma.session.deleteMany({ where: { endUserId: endUser.id } }),
    ]);

    logAuthEvent({
      type: "password_reset",
      projectId: project.id,
      endUserId: endUser.id,
      ...clientMeta(req),
    });

    return res.status(200).json({
      success: true,
      message: "Password updated. Please sign in again.",
    });
  } catch (error) {
    console.error("[sdk/password/reset/confirm]", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
