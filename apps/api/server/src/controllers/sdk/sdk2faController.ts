import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { prisma } from "../../config/db.ts";
import {
  generateSecret,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "../../utils/totp.ts";
import { issueTokens } from "../../utils/generateToken.ts";
import { logAuthEvent } from "../../utils/logAuthEvent.ts";
import { sendSuccess, sendError, handleError } from "../../utils/apiResponse.ts";
import { SdkErrorCode } from "../../constants/errorCodes.ts";

const JWT_SECRET = process.env.JWT_SECRET!;

function clientMeta(req: Request) {
  return {
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
      req.socket.remoteAddress ??
      undefined,
    userAgent: req.headers["user-agent"] ?? undefined,
  };
}

/** Strips sensitive fields before returning user object */
function safeUser(u: any) {
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

/**
 * Initiates TOTP 2FA enrollment.
 * POST /sdk/auth/2fa/setup
 */
export async function setup2fa(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const project = req.sdkProject!;

    if (user.twoFactorEnabled) {
      return sendError(
        res,
        "Two-factor authentication is already enabled.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const rawSecret = generateSecret();
    const encryptedSecret = encryptSecret(rawSecret);

    // Save temporary secret to database
    await prisma.endUser.update({
      where: { id: user.id },
      data: { twoFactorSecret: encryptedSecret },
    });

    const issuer = encodeURIComponent(project.name);
    const email = encodeURIComponent(user.email);
    const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${rawSecret}&issuer=${issuer}`;

    return sendSuccess(res, {
      secret: rawSecret,
      otpauthUrl,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/2fa/setup]");
  }
}

/**
 * Verifies code and enables 2FA, returning recovery codes.
 * POST /sdk/auth/2fa/enable
 */
export async function enable2fa(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const { code } = req.body;

    if (!code) {
      return sendError(
        res,
        "Verification code is required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    if (!user.twoFactorSecret) {
      return sendError(
        res,
        "2FA setup has not been initiated. Call /2fa/setup first.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    const rawSecret = decryptSecret(user.twoFactorSecret);
    const isValid = verifyTotp(rawSecret, code);

    if (!isValid) {
      return sendError(
        res,
        "Invalid 2FA code. Verification failed.",
        SdkErrorCode.INVALID_CREDENTIALS,
        400
      );
    }

    // Generate recovery backup codes
    const recoveryCodes = generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((c) => ({
      endUserId: user.id,
      codeHash: hashRecoveryCode(c),
    }));

    // Save recovery codes and enable 2FA in a single transaction
    await prisma.$transaction([
      prisma.twoFactorBackupCode.deleteMany({ where: { endUserId: user.id } }),
      prisma.twoFactorBackupCode.createMany({ data: hashedCodes }),
      prisma.endUser.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      }),
    ]);

    const meta = clientMeta(req);
    await logAuthEvent({
      projectId: user.projectId,
      endUserId: user.id,
      type: "2fa_enabled",
      ...meta,
    });

    return sendSuccess(res, {
      twoFactorEnabled: true,
      recoveryCodes,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/2fa/enable]");
  }
}

/**
 * Disables 2FA.
 * POST /sdk/auth/2fa/disable
 */
export async function disable2fa(req: Request, res: Response) {
  try {
    const user = req.endUser!;
    const { password, code } = req.body;

    if (!user.twoFactorEnabled) {
      return sendError(
        res,
        "2FA is already disabled.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    // Verify Password if user has passwordHash
    if (user.passwordHash) {
      if (!password) {
        return sendError(
          res,
          "Password is required to disable 2FA.",
          SdkErrorCode.BAD_REQUEST,
          400
        );
      }
      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        return sendError(
          res,
          "Incorrect password.",
          SdkErrorCode.INVALID_CREDENTIALS,
          401
        );
      }
    }

    // Verify TOTP code or recovery backup code
    if (!code) {
      return sendError(
        res,
        "TOTP verification code or recovery code is required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    let isCodeValid = false;
    if (user.twoFactorSecret) {
      const rawSecret = decryptSecret(user.twoFactorSecret);
      isCodeValid = verifyTotp(rawSecret, code);
    }

    if (!isCodeValid) {
      // Fallback: Check backup codes
      const hashedInput = hashRecoveryCode(code);
      const backupCode = await prisma.twoFactorBackupCode.findFirst({
        where: {
          endUserId: user.id,
          codeHash: hashedInput,
          usedAt: null,
        },
      });

      if (backupCode) {
        isCodeValid = true;
        await prisma.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!isCodeValid) {
      return sendError(
        res,
        "Invalid verification code.",
        SdkErrorCode.INVALID_CREDENTIALS,
        400
      );
    }

    // Remove 2FA configurations
    await prisma.$transaction([
      prisma.twoFactorBackupCode.deleteMany({ where: { endUserId: user.id } }),
      prisma.endUser.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      }),
    ]);

    const meta = clientMeta(req);
    await logAuthEvent({
      projectId: user.projectId,
      endUserId: user.id,
      type: "2fa_disabled",
      ...meta,
    });

    return sendSuccess(res, {
      twoFactorEnabled: false,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/2fa/disable]");
  }
}

/**
 * Exchanges a valid 2FA TOTP or recovery code + transient challenge token for active session tokens.
 * POST /sdk/auth/2fa/verify
 */
export async function verify2fa(req: Request, res: Response) {
  try {
    const { 2faToken, code } = req.body;

    if (!2faToken || !code) {
      return sendError(
        res,
        "2faToken and code are required.",
        SdkErrorCode.BAD_REQUEST,
        400
      );
    }

    // Verify 2FA transient challenge JWT
    let payload: any;
    try {
      payload = jwt.verify(2faToken, JWT_SECRET);
      if (payload.type !== "2fa_challenge") {
        throw new Error("Invalid token type");
      }
    } catch {
      return sendError(
        res,
        "Invalid or expired 2FA challenge token.",
        SdkErrorCode.INVALID_TOKEN,
        401
      );
    }

    const { id, projectId } = payload;

    const user = await prisma.endUser.findUnique({
      where: { id },
    });

    if (!user || user.banned || user.projectId !== projectId) {
      return sendError(
        res,
        "User not found or suspended.",
        SdkErrorCode.USER_BANNED,
        401
      );
    }

    let isCodeValid = false;

    // Check TOTP code
    if (user.twoFactorSecret) {
      const rawSecret = decryptSecret(user.twoFactorSecret);
      isCodeValid = verifyTotp(rawSecret, code);
    }

    // Check recovery backup codes if TOTP fails
    if (!isCodeValid) {
      const hashedInput = hashRecoveryCode(code);
      const backupCode = await prisma.twoFactorBackupCode.findFirst({
        where: {
          endUserId: user.id,
          codeHash: hashedInput,
          usedAt: null,
        },
      });

      if (backupCode) {
        isCodeValid = true;
        // Mark code as used
        await prisma.twoFactorBackupCode.update({
          where: { id: backupCode.id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!isCodeValid) {
      await logAuthEvent({
        projectId,
        endUserId: user.id,
        type: "2fa_failed",
        ...clientMeta(req),
        metadata: { reason: "invalid_code" },
      });

      return sendError(
        res,
        "Invalid 2FA code.",
        SdkErrorCode.INVALID_CREDENTIALS,
        401
      );
    }

    // Success: issue final tokens
    const settings = req.sdkProject?.settings;
    const meta = clientMeta(req);

    const { accessToken, refreshToken } = await issueTokens(
      { type: "endUser", id: user.id, projectId },
      res,
      meta,
      {
        sessionDurationDays: settings?.sessionDurationDays,
        jwtDurationSeconds: settings?.jwtDurationSeconds,
      }
    );

    // Update lastSignInAt
    await prisma.endUser.update({
      where: { id: user.id },
      data: { lastSignInAt: new Date() },
    });

    await logAuthEvent({
      projectId,
      endUserId: user.id,
      type: "signin",
      ...meta,
      metadata: { method: "2fa" },
    });

    return sendSuccess(res, {
      user: safeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return handleError(res, error, "[sdk/2fa/verify]");
  }
}
