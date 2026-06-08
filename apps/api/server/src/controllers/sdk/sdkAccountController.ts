import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  generateVerificationCode,
  sendEmailChangeCode,
} from "../../utils/mailer.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";
import { sendSuccess, sendError, handleError } from "../../utils/apiResponse.ts";
import { SdkErrorCode } from "../../constants/errorCodes.ts";

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
      return sendError(res, 400, "currentPassword and newPassword are required.", SdkErrorCode.BAD_REQUEST);
    }

    // Guard: social-sign-in only accounts cannot use this endpoint
    if (!endUser.passwordHash) {
      return sendError(res, 400, "This account was created with social sign-in and has no password. Use the forgot password flow to set one.", SdkErrorCode.BAD_REQUEST);
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
      return sendError(res, 401, "Current password is incorrect.", SdkErrorCode.INVALID_PASSWORD);
    }

    // Prevent reuse of the same password
    const isSame = await argon2.verify(endUser.passwordHash, newPassword);
    if (isSame) {
      return sendError(res, 400, "New password must be different from your current password.", SdkErrorCode.PASSWORD_MISMATCH);
    }

    // ── Password policy ────────────────────────────────────────────────────
    if (settings) {
      const min = settings.passwordMinLength;
      if (newPassword.length < min) {
        return sendError(res, 400, `Password must be at least ${min} characters.`, SdkErrorCode.WEAK_PASSWORD);
      }
      if (settings.passwordRequireUppercase && !/[A-Z]/.test(newPassword)) {
        return sendError(res, 400, "Password must contain at least one uppercase letter.", SdkErrorCode.WEAK_PASSWORD);
      }
      if (settings.passwordRequireNumber && !/\d/.test(newPassword)) {
        return sendError(res, 400, "Password must contain at least one number.", SdkErrorCode.WEAK_PASSWORD);
      }
      if (
        settings.passwordRequireSymbol &&
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return sendError(res, 400, "Password must contain at least one special character.", SdkErrorCode.WEAK_PASSWORD);
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

    return sendSuccess(res, {});
  } catch (error) {
    console.error("[sdk/password/change]", error);
    return handleError(res, error);
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
      return sendError(res, 400, "newEmail is required.", SdkErrorCode.BAD_REQUEST);
    }

    const normalizedNew = newEmail.trim().toLowerCase();

    // Must actually be different
    if (normalizedNew === endUser.email) {
      return sendError(res, 400, "New email must be different from your current email.", SdkErrorCode.BAD_REQUEST);
    }

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNew)) {
      return sendError(res, 400, "Please provide a valid email address.", SdkErrorCode.BAD_REQUEST);
    }

    // Check the new email is not already taken by another user in this project
    const conflict = await prisma.endUser.findUnique({
      where: {
        projectId_email: { projectId: project.id, email: normalizedNew },
      },
      select: { id: true },
    });
    if (conflict) {
      return sendError(res, 409, "That email address is already in use.", SdkErrorCode.EMAIL_ALREADY_EXISTS);
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
      return sendError(res, 429, `Please wait ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} before requesting another code.`, SdkErrorCode.TOO_MANY_REQUESTS);
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

    return sendSuccess(res, {});
  } catch (error) {
    console.error("[sdk/email/change]", error);
    return handleError(res, error);
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
      return sendError(res, 400, "code is required.", SdkErrorCode.BAD_REQUEST);
    }

    // Guard: no pending email means no change was requested
    if (!endUser.pendingEmail) {
      return sendError(res, 400, "No email change is pending. Call /sdk/auth/email/change first.", SdkErrorCode.BAD_REQUEST);
    }

    const record = await prisma.verificationToken.findFirst({
      where: {
        endUserId: endUser.id,
        token: code.trim(),
        type: "EMAIL_CHANGE",
      },
    });

    if (!record) {
      return sendError(res, 400, "Invalid verification code.", SdkErrorCode.INVALID_CODE);
    }

    if (record.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: record.id } });
      // Also clear the stale pendingEmail
      await prisma.endUser.update({
        where: { id: endUser.id },
        data: { pendingEmail: null },
      });
      return sendError(res, 400, "Verification code has expired. Request a new one.", SdkErrorCode.CODE_EXPIRED);
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
      return sendError(res, 409, "That email address was taken while you were confirming. Please start the email change again.", SdkErrorCode.EMAIL_ALREADY_EXISTS);
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

    return sendSuccess(res, {});
  } catch (error) {
    console.error("[sdk/email/change/confirm]", error);
    return handleError(res, error);
  }
}
