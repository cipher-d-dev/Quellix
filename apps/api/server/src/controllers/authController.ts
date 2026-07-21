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
  sendAccountLinkCode,
} from "../utils/mailer.ts";

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, username } = req.body;

    const existingAccount = await prisma.developer.findUnique({
      where: { email },
    });

    if (existingAccount) {
      const isOAuthOnly =
        !!existingAccount.githubId && !existingAccount.passwordHash;

      // ── Account linking path ─────────────────────────────────────────────
      // The account was created via OAuth and has no password yet.
      // We can offer to add password login after proving inbox ownership.
      // We deliberately do NOT mention which OAuth provider to avoid leaking
      // which emails in the DB are OAuth accounts — the ACCOUNT_LINKABLE code
      // is enough for the frontend to branch into the linking UI.
      if (isOAuthOnly) {
        // Rate-limit: one link request per 60 seconds
        const recentToken = await prisma.verificationToken.findFirst({
          where: {
            developerId: existingAccount.id,
            type: "ACCOUNT_LINK",
            createdAt: { gte: new Date(Date.now() - 60_000) },
          },
        });

        if (recentToken) {
          const secondsLeft = Math.ceil(
            (recentToken.createdAt.getTime() + 60_000 - Date.now()) / 1000,
          );
          return res.status(429).json({
            success: false,
            code: "ACCOUNT_LINKABLE",
            error: `Please wait ${secondsLeft}s before requesting another code.`,
          });
        }

        // Hash the password now and keep it in a separate pending-link row.
        // This is safe: it is a hash (never plaintext), lives server-side only,
        // and expires in 10 minutes alongside its verification code.
        const pendingHash = await argon2.hash(password);
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60_000);

        // Rotate any stale ACCOUNT_LINK tokens for this developer
        await prisma.verificationToken.deleteMany({
          where: { developerId: existingAccount.id, type: "ACCOUNT_LINK" },
        });

        // Store the code. We embed the pending hash in the token string using
        // a delimiter so we don't need a schema migration for a metadata column.
        // Format:  "<code>:<argon2hash>"
        await prisma.verificationToken.create({
          data: {
            developerId: existingAccount.id,
            token: `${code}:${pendingHash}`,
            type: "ACCOUNT_LINK",
            expiresAt,
          },
        });

        await sendAccountLinkCode(existingAccount.email, code);

        return res.status(409).json({
          success: false,
          code: "ACCOUNT_LINKABLE",
          // Message is intentionally vague — provider is not named
          message: "Check your inbox for a code to continue.",
        });
      }

      // Plain duplicate — already has a password or is fully linked
      return res.status(400).json({
        success: false,
        error: "Looks like that email is already registered.",
      });
    }

    if (username) {
      // ── Username uniqueness check ────────────────────────────────────────
      // Must run before create(). The DB has a @unique constraint so skipping
      // this would produce a confusing P2002 500 instead of a helpful 400.
      const usernameTaken = await prisma.developer.findUnique({
        where: { username },
      });

      if (usernameTaken) {
        // Generate a unique suggestion so the user isn't left stuck.
        const base = (fullName?.trim() || email.split("@")[0])
          .toLowerCase()
          .replace(/\s+/g, "");

        let suggestion: string | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        while (attempts < MAX_ATTEMPTS) {
          const candidate = `${base}${Math.floor(Math.random() * 1000)}${randomBytes(2)
            .toString("hex")
            .slice(0, 3)}`;

          const exists = await prisma.developer.findUnique({
            where: { username: candidate },
          });

          if (!exists) {
            suggestion = candidate;
            break;
          }
          attempts++;
        }

        // Extremely unlikely fallback
        if (!suggestion) suggestion = `${base}${Date.now()}`;

        return res.status(400).json({
          success: false,
          code: "USERNAME_TAKEN",
          error: `@${username} is already taken — how about @${suggestion}?`,
          suggestion,
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
// POST /auth/link-password
//
// Second step of the account-linking flow. The user enters the 8-char code
// that was emailed to them during register()'s ACCOUNT_LINKABLE path.
// On success their existing OAuth account gets a passwordHash and
// authProvider becomes "both".
// ---------------------------------------------------------------------------

export const confirmLinkPassword = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email.toString().toLowerCase().trim();
    const normalizedCode = code.toString().replace(/\s/g, "");

    const developer = await prisma.developer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!developer) {
      return res.status(404).json({
        success: false,
        error: "No account found with that email address.",
      });
    }

    // Guard: don't let a stale link token add a second password to a fully
    // linked account — that would be a silent credential replacement.
    if (developer.passwordHash) {
      return res.status(400).json({
        success: false,
        error: "This account already has password login enabled.",
      });
    }

    // Find the ACCOUNT_LINK token for this developer
    const linkToken = await prisma.verificationToken.findFirst({
      where: {
        developerId: developer.id,
        type: "ACCOUNT_LINK",
      },
    });

    if (!linkToken) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired code." });
    }

    if (linkToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: linkToken.id } });
      return res.status(400).json({
        success: false,
        error:
          "That code has expired. Please try signing up again to get a new one.",
      });
    }

    // Token format: "<code>:<argon2hash>"
    const delimIdx = linkToken.token.indexOf(":");
    if (delimIdx === -1) {
      return res.status(400).json({
        success: false,
        error: "Invalid link session. Please try signing up again.",
      });
    }

    const storedCode = linkToken.token.slice(0, delimIdx);
    const pendingHash = linkToken.token.slice(delimIdx + 1);

    if (storedCode !== normalizedCode) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired code." });
    }

    // Determine new authProvider: if they had githubId, they can use both
    const newAuthProvider = developer.githubId ? "both" : "email";

    await prisma.$transaction([
      prisma.developer.update({
        where: { id: developer.id },
        data: {
          passwordHash: pendingHash,
          authProvider: newAuthProvider,
          // Inbox ownership is proved by entering the emailed code
          emailVerified: true,
        },
      }),
      prisma.verificationToken.delete({ where: { id: linkToken.id } }),
    ]);

    const tokens = await issueTokens(
      { type: "developer", id: developer.id },
      res,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] },
    );

    const updated = await prisma.developer.findUnique({
      where: { id: developer.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        authProvider: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password login added. You can now sign in with either method.",
      data: {
        accessToken: tokens.accessToken,
        developer: updated,
      },
    });
  } catch (error) {
    console.error("Link password error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
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

    // OAuth-only account — no password set. Return the same generic error so
    // we don't reveal which emails use OAuth.
    if (!developer.passwordHash) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials." });
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
      return res.status(401).json({
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

    // OAuth-only account — no password to reset
    if (!developer.passwordHash && developer.githubId) {
      return res.status(400).json({
        success: false,
        error:
          "This account uses social sign-in. Password reset is not available.",
      });
    }

    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        developerId: developer.id,
        type: "PASSWORD_RESET",
        createdAt: { gte: new Date(Date.now() - 60_000) },
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
    const expiresAt = new Date(Date.now() + 10 * 60_000);

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
      return res.status(404).json({
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
      return res.status(400).json({
        success: false,
        error: "That reset code has expired. Please request a new one.",
      });
    }

    const passwordHash = await argon2.hash(password);

    // If the account had OAuth, promote to "both" since inbox ownership is
    // proved by entering the reset code.
    const newAuthProvider = developer.githubId ? "both" : "email";

    await prisma.$transaction([
      prisma.developer.update({
        where: { id: developer.id },
        data: { passwordHash, authProvider: newAuthProvider },
      }),
      prisma.verificationToken.delete({ where: { id: resetToken.id } }),
      prisma.session.deleteMany({ where: { developerId: developer.id } }),
    ]);

    clearAuthCookies(res);
    return res.status(200).json({
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
