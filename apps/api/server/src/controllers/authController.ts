import type { Request, Response } from "express";
import { prisma } from "../config/db.ts";
import argon2 from "argon2";
import { randomBytes } from "crypto";
import {
  issueTokens,
  revokeSession,
  rotateTokens,
  clearAuthCookies,
  verifyAccessToken,
} from "../utils/generateToken.ts";
import { sendEmailVerification } from "./emailVerificationController.ts";
import {
  generateVerificationCode,
  sendPasswordResetCode,
} from "../utils/mailer.ts";

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, username } = req.body;

    const emailTaken = await prisma.developer.findUnique({ where: { email } });
    if (emailTaken) {
      // If the account was created via GitHub OAuth, tell the user explicitly
      // Do NOT reveal whether the existing account uses GitHub or email —
      // that would leak which emails in the DB are OAuth accounts.
      return res.status(400).json({
        success: false,
        error: "Looks like that email is already registered.",
      });
    }

    if (username) {
      const usernameTaken = await prisma.developer.findUnique({
        where: { username },
      });
      if (usernameTaken) {
        const base = fullName?.trim() || email.split("@")[0];
        const suggestion = `${base.toLowerCase().replace(/\s+/g, "")}${Math.floor(
          Math.random() * 1000,
        )}${randomBytes(2).toString("hex").slice(0, 3)}`;
        return res.status(400).json({
          success: false,
          error: `@${username} is already taken — how about @${suggestion}?`,
        });
      }
    }

    const passwordHash = await argon2.hash(password);

    const developer = await prisma.developer.create({
      data: {
        fullName: fullName || null,
        email,
        passwordHash,
        username: username || null,
        authProvider: "email",
        emailVerified: false,
      },
    });

    await sendEmailVerification("developer", developer.id, developer.email);

    const tokens = await issueTokens(
      { type: "developer", id: developer.id },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    return res.status(201).json({
      success: true,
      message: "Account created! Check your email for a verification code.",
      data: {
        accessToken: tokens.accessToken,
        developer: {
          id: developer.id,
          fullName: developer.fullName,
          email: developer.email,
          username: developer.username,
          avatarUrl: developer.avatarUrl,
          emailVerified: developer.emailVerified,
          authProvider: developer.authProvider,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during registration. Please try again.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

export const login = async (req: Request, res: Response) => {
  try {
    const { email: identifier, password } = req.body;

    const developer = await prisma.developer.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!developer) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    // GitHub-only account has no password — return the same generic message
    // as a wrong password so we don't reveal which emails use OAuth.
    if (!developer.passwordHash) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials.",
      });
    }

    const isPasswordValid = await argon2.verify(
      developer.passwordHash,
      password,
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
    }

    const tokens = await issueTokens(
      { type: "developer", id: developer.id },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    return res.status(200).json({
      success: true,
      message: "Welcome back!",
      data: {
        accessToken: tokens.accessToken,
        developer: {
          id: developer.id,
          fullName: developer.fullName,
          email: developer.email,
          username: developer.username,
          avatarUrl: developer.avatarUrl,
          emailVerified: developer.emailVerified,
          authProvider: developer.authProvider,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during login. Please try again.",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) await revokeSession(refreshToken);
    clearAuthCookies(res);
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong during logout." });
  }
};

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, error: "No refresh token provided." });
    }

    const tokens = await rotateTokens(refreshToken, res, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (!tokens) {
      return res
        .status(401)
        .json({
          success: false,
          error: "Session expired. Please log in again.",
        });
    }

    const payload = verifyAccessToken(tokens.accessToken);
    if (!payload || payload.type !== "developer") {
      return res
        .status(401)
        .json({ success: false, error: "Invalid token payload." });
    }

    const developer = await prisma.developer.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
      },
    });

    if (!developer) {
      return res
        .status(401)
        .json({ success: false, error: "Developer not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
      data: { accessToken: tokens.accessToken, developer },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
};

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toString().toLowerCase().trim();
    const developer = await prisma.developer.findUnique({
      where: { email: normalizedEmail },
    });

    const genericResponse = {
      success: true,
      message:
        "If that email is registered, a password reset code is on its way.",
    };

    if (!developer) return res.status(200).json(genericResponse);

    // GitHub-only accounts have no password to reset
    if (!developer.passwordHash && developer.githubId) {
      return res.status(400).json({
        success: false,
        error:
          "This account uses GitHub sign-in. Password reset is not available.",
      });
    }

    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        developerId: developer.id,
        type: "PASSWORD_RESET",
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentToken) {
      const secondsLeft = Math.ceil(
        (recentToken.createdAt.getTime() + 60_000 - Date.now()) / 1000,
      );
      return res.status(429).json({
        success: false,
        error: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} before requesting another reset code.`,
      });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { developerId: developer.id, type: "PASSWORD_RESET" },
    });
    await prisma.verificationToken.create({
      data: {
        developerId: developer.id,
        token: code,
        type: "PASSWORD_RESET",
        expiresAt,
      },
    });
    await sendPasswordResetCode("developer", developer.email, code);

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
};

// ---------------------------------------------------------------------------
// POST /auth/reset-password
// ---------------------------------------------------------------------------

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, password } = req.body;
    const normalizedEmail = email.toString().toLowerCase().trim();
    const normalizedCode = code.toString().replace(/\s/g, "");

    const developer = await prisma.developer.findUnique({
      where: { email: normalizedEmail },
    });
    if (!developer) {
      return res
        .status(404)
        .json({
          success: false,
          error: "No account found with that email address.",
        });
    }

    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        developerId: developer.id,
        token: normalizedCode,
        type: "PASSWORD_RESET",
      },
    });
    if (!resetToken) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid reset code." });
    }
    if (resetToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: resetToken.id } });
      return res
        .status(400)
        .json({
          success: false,
          error: "That reset code has expired. Please request a new one.",
        });
    }

    const passwordHash = await argon2.hash(password);

    await prisma.$transaction([
      prisma.developer.update({
        where: { id: developer.id },
        data: { passwordHash, authProvider: "email" }, // restore email auth if they had GitHub only
      }),
      prisma.verificationToken.delete({ where: { id: resetToken.id } }),
      prisma.session.deleteMany({ where: { developerId: developer.id } }),
    ]);

    clearAuthCookies(res);
    return res
      .status(200)
      .json({
        success: true,
        message: "Password updated. Please log in with your new password.",
      });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
};
