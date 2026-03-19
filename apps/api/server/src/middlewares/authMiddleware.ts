import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/generateToken.ts";
import { prisma } from "../config/db.ts";

declare global {
  namespace Express {
    interface Request {
      developer?: {
        id: string;
        email: string;
        fullName: string | null;
        username: string | null;
        avatarUrl: string | null;
        emailVerified: boolean;
        authProvider: string;
      };
    }
  }
}

/**
 * Reads the Bearer token from the Authorization header,
 * verifies it, and attaches the developer to req.developer.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required." });
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (!payload || payload.type !== "developer") {
      return res
        .status(401)
        .json({ success: false, error: "Invalid or expired token." });
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

    req.developer = developer;
    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, error: "Authentication failed." });
  }
}
