import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, isEndUserPayload } from "../utils/generateToken.ts";
import { prisma } from "../config/db.ts";
import type { EndUser } from "@prisma/client";

// ---------------------------------------------------------------------------
// Extend Express Request with authenticated end user
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      endUser?: EndUser;
    }
  }
}

// ---------------------------------------------------------------------------
// requireEndUserAuth
//
// Validates an end-user access token (JWT) from the Authorization header.
// Must be used AFTER resolveSdkKey so req.sdkProject is available.
//
// Security checks:
//   1. Token must be a valid JWT signed with our secret
//   2. Token payload.type must be "endUser" (not "developer")
//   3. Token payload.projectId must match req.sdkProject.id
//      → prevents a token from Project A being used on Project B endpoints
//   4. The EndUser record must still exist and not be banned
// ---------------------------------------------------------------------------

export async function requireEndUserAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token.",
      });
    }

    // Guard: developer tokens must never pass end-user auth checks
    if (!isEndUserPayload(payload)) {
      return res.status(401).json({
        success: false,
        error: "Invalid token type.",
      });
    }

    // Guard: token must belong to the same project as the API key
    if (req.sdkProject && payload.projectId !== req.sdkProject.id) {
      return res.status(401).json({
        success: false,
        error: "Token does not belong to this project.",
      });
    }

    const endUser = await prisma.endUser.findUnique({
      where: { id: payload.id },
    });

    if (!endUser) {
      return res.status(401).json({
        success: false,
        error: "User not found.",
      });
    }

    if (endUser.banned) {
      return res.status(403).json({
        success: false,
        error:
          "Your account has been suspended. Contact the application owner.",
      });
    }

    req.endUser = endUser;
    return next();
  } catch (error) {
    console.error("[requireEndUserAuth] error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
