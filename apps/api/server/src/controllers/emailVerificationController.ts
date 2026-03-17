import type { Request, Response } from "express";
import { prisma } from "../config/db.ts";
import {
  generateVerificationCode,
  sendVerificationCode,
} from "../utils/mailer.ts";

// ---------------------------------------------------------------------------
// Internal helper — called by the register controller after account creation.
// Non-throwing: a mail failure must never block registration.
// ---------------------------------------------------------------------------

export async function sendEmailVerification(
  type: "developer" | "endUser",
  subjectId: string,
  email: string,
  options?: { appName?: string },
): Promise<{ success: boolean }> {
  try {
    const code = generateVerificationCode(); // 8-char alphanumeric
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const ownerClause =
      type === "developer"
        ? { developerId: subjectId }
        : { endUserId: subjectId };

    // Rotate: remove any outstanding code for this subject first
    await prisma.verificationToken.deleteMany({
      where: { ...ownerClause, type: "EMAIL_VERIFICATION" },
    });

    await prisma.verificationToken.create({
      data: {
        ...ownerClause,
        token: code,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      },
    });

    await sendVerificationCode(type, email, code, options);

    return { success: true };
  } catch (error) {
    console.error(`Failed to send ${type} verification code:`, error);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// POST /auth/verify-email
//
// Body (developer):  { type: "developer"; email: string; code: string }
// Body (end user):   { type: "endUser";   email: string; code: string; projectId: string }
// ---------------------------------------------------------------------------

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { type, email, code, projectId } = req.body;

    if (!type || !email || !code) {
      return res.status(400).json({
        success: false,
        error: "type, email, and code are required.",
      });
    }

    if (type !== "developer" && type !== "endUser") {
      return res.status(400).json({
        success: false,
        error: "type must be 'developer' or 'endUser'.",
      });
    }

    if (type === "endUser" && !projectId) {
      return res.status(400).json({
        success: false,
        error: "projectId is required for end user verification.",
      });
    }

    const normalizedCode = code.toString().replace(/\s/g, "");
    const normalizedEmail = email.toString().toLowerCase().trim();

    // 8-character alphanumeric — matches generateVerificationCode output
    if (
      normalizedCode.length !== 8 ||
      !/^[A-Za-z0-9]{8}$/.test(normalizedCode)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid code format. Please paste the code exactly as it appeared in your email.",
      });
    }

    const subject = await resolveSubject(type, normalizedEmail, projectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: "No account found with that email address.",
      });
    }

    if (subject.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "This email is already verified.",
      });
    }

    const ownerClause =
      type === "developer"
        ? { developerId: subject.id }
        : { endUserId: subject.id };

    // Scoped to this subject — a code for a different account will not match
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        ...ownerClause,
        token: normalizedCode,
        type: "EMAIL_VERIFICATION",
      },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code.",
      });
    }

    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      return res.status(400).json({
        success: false,
        error: "That code has expired. Request a new one and try again.",
      });
    }

    // Mark verified and clean up the token atomically
    await prisma.$transaction([
      markVerified(type, subject.id),
      prisma.verificationToken.delete({ where: { id: verificationToken.id } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You now have full access.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during verification. Please try again.",
    });
  }
}

// ---------------------------------------------------------------------------
// POST /auth/resend-verification
//
// Body (developer):  { type: "developer"; email: string }
// Body (end user):   { type: "endUser";   email: string; projectId: string; appName?: string }
// ---------------------------------------------------------------------------

export async function resendVerification(req: Request, res: Response) {
  try {
    const { type, email, projectId, appName } = req.body;

    if (!type || !email) {
      return res.status(400).json({
        success: false,
        error: "type and email are required.",
      });
    }

    if (type !== "developer" && type !== "endUser") {
      return res.status(400).json({
        success: false,
        error: "type must be 'developer' or 'endUser'.",
      });
    }

    if (type === "endUser" && !projectId) {
      return res.status(400).json({
        success: false,
        error: "projectId is required for end user verification.",
      });
    }

    const normalizedEmail = email.toString().toLowerCase().trim();
    const subject = await resolveSubject(type, normalizedEmail, projectId);

    // Respond identically whether the account exists or not — prevents email enumeration
    if (!subject) {
      return res.status(200).json({
        success: true,
        message:
          "If that email is registered, a new verification code has been sent.",
      });
    }

    if (subject.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "This email is already verified.",
      });
    }

    // Rate-limit: one request per 60 seconds
    const ownerClause =
      type === "developer"
        ? { developerId: subject.id }
        : { endUserId: subject.id };

    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        ...ownerClause,
        type: "EMAIL_VERIFICATION",
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentToken) {
      const secondsLeft = Math.ceil(
        (recentToken.createdAt.getTime() + 60_000 - Date.now()) / 1000,
      );
      return res.status(429).json({
        success: false,
        error: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} before requesting a new code.`,
      });
    }

    await sendEmailVerification(type, subject.id, subject.email, { appName });

    return res.status(200).json({
      success: true,
      message: "Verification code sent. Check your email.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface VerificationSubject {
  id: string;
  email: string;
  emailVerified: boolean;
}

async function resolveSubject(
  type: "developer" | "endUser",
  email: string,
  projectId?: string,
): Promise<VerificationSubject | null> {
  if (type === "developer") {
    return prisma.developer.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });
  }

  if (!projectId) return null;

  return prisma.endUser.findUnique({
    where: { projectId_email: { projectId, email } },
    select: { id: true, email: true, emailVerified: true },
  });
}

function markVerified(type: "developer" | "endUser", id: string) {
  if (type === "developer") {
    return prisma.developer.update({
      where: { id },
      data: { emailVerified: true },
    });
  }
  return prisma.endUser.update({
    where: { id },
    data: { emailVerified: true },
  });
}
