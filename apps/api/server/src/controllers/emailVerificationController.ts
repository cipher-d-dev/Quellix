import express from "express";
import { prisma } from "../config/db";
import {
  generateVerificationCode,
  sendVerificationCode,
} from "../utils/mailer.ts";

/**
 * Send verification code after registration
 * Called internally by register function
 */
export async function sendEmailVerification(
  developerId: string,
  email: string,
) {
  try {
    // Generate 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
 
    // Delete any existing verification codes for this developer
    await prisma.verificationToken.deleteMany({
      where: {
        endUserId: developerId,
        type: "EMAIL_VERIFICATION",
      },
    });

    // Store code in database
    await prisma.verificationToken.create({
      data: {
        endUserId: developerId,
        token: code,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      },
    });

    // Send email (non-blocking - don't throw on error)
    await sendVerificationCode(email, code);

    return { success: true };
  } catch (error) {
    console.error("Failed to send verification code:", error);
    // Don't throw - we don't want to block registration if email fails
    return { success: false };
  }
}

/**
 * POST /auth/verify-email
 * Verify email with 6-digit code
 */
export async function verifyEmail(req: express.Request, res: express.Response) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Verification code is required",
      });
    }

    // Normalize code (remove spaces, convert to string)
    const normalizedCode = code.toString().replace(/\s/g, "");

    if (normalizedCode.length !== 6 || !/^\d{6}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        error: "Invalid code format. Please enter a 6-digit code.",
      });
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: normalizedCode,
        type: "EMAIL_VERIFICATION",
      },
      include: {
        endUser: true,
      },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code",
      });
    }

    // Check if code expired
    if (verificationToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please request a new one.",
      });
    }

    // Update developer email verification status
    await prisma.developer.update({
      where: { id: verificationToken.endUserId },
      data: { emailVerified: true },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now access all features.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during verification. Please try again.",
    });
  }
}

/**
 * POST /auth/resend-verification
 * Resend verification code
 */
export async function resendVerification(
  req: express.Request,
  res: express.Response,
) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Find developer
    const developer = await prisma.developer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!developer) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: "If that email exists, we've sent a new verification code.",
      });
    }

    // Check if already verified
    if (developer.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "This email is already verified",
      });
    }

    // Check rate limiting (prevent spam)
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        endUserId: developer.id,
        type: "EMAIL_VERIFICATION",
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // Within last 60 seconds
        },
      },
    });

    if (recentToken) {
      return res.status(429).json({
        success: false,
        error: "Please wait 60 seconds before requesting a new code",
      });
    }

    // Send new verification code
    await sendEmailVerification(developer.id, developer.email);

    return res.status(200).json({
      success: true,
      message: "Verification code sent! Check your email.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
}

/**
 * Helper: Format remaining time for rate limit errors
 */
function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}
