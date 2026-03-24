import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/db.ts";
import type { Project, ApiKey, ProjectSettings } from "@prisma/client";

// ---------------------------------------------------------------------------
// Extend Express Request with SDK context
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      sdkProject?: Project & { settings: ProjectSettings | null };
      sdkApiKey?: ApiKey;
    }
  }
}

// ---------------------------------------------------------------------------
// resolveSdkKey
//
// Reads the Authorization: Bearer <key> header, hashes it, looks up the
// ApiKey record, and attaches the project + key to the request.
//
// Does NOT check key type — use requireKeyType() after this middleware
// to assert PUBLISHABLE or SECRET depending on the route.
// ---------------------------------------------------------------------------

export async function resolveSdkKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer qlx_")) {
      return res.status(401).json({
        success: false,
        error:
          "API key required. Pass your key as: Authorization: Bearer <key>",
      });
    }

    const rawKey = authHeader.slice(7); // strip "Bearer "
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key.",
      });
    }

    if (apiKey.revokedAt) {
      return res.status(401).json({
        success: false,
        error: "This API key has been revoked.",
      });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: "This API key has expired.",
      });
    }

    // Load project + settings in one query
    const project = await prisma.project.findUnique({
      where: { id: apiKey.projectId },
      include: { settings: true },
    });

    if (!project) {
      // Key exists but project was deleted — shouldn't happen due to cascade
      // but guard anyway
      return res.status(401).json({
        success: false,
        error: "Project not found.",
      });
    }

    // Fire-and-forget: update lastUsedAt without blocking the request
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) =>
        console.error("[resolveSdkKey] lastUsedAt update failed:", e),
      );

    // Validate origin against project allowedOrigins if the list is non-empty.
    // An empty list means open CORS (suitable during development).
    const origin = req.headers.origin;
    const allowedOrigins = project.settings?.allowedOrigins ?? [];
    if (allowedOrigins.length > 0 && origin) {
      if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({
          success: false,
          error: `Origin "${origin}" is not allowed for this project. Add it in your project settings.`,
        });
      }
    }

    req.sdkProject = project as Project & { settings: ProjectSettings | null };
    req.sdkApiKey = apiKey;

    return next();
  } catch (error) {
    console.error("[resolveSdkKey] error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// requireKeyType
//
// Must be used after resolveSdkKey.
// Gates a route to only publishable or only secret keys.
//
// Usage:
//   router.post("/register", resolveSdkKey, requireKeyType("PUBLISHABLE"), handler)
//   router.get("/users",     resolveSdkKey, requireKeyType("SECRET"),      handler)
// ---------------------------------------------------------------------------

export function requireKeyType(type: "PUBLISHABLE" | "SECRET") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.sdkApiKey) {
      return res
        .status(401)
        .json({ success: false, error: "API key not resolved." });
    }
    if (req.sdkApiKey.type !== type) {
      const hint =
        type === "SECRET"
          ? "This endpoint requires a secret key (qlx_sec_...). Never use secret keys in client-side code."
          : "This endpoint requires a publishable key (qlx_pub_...).";
      return res.status(403).json({ success: false, error: hint });
    }
    return next();
  };
}
