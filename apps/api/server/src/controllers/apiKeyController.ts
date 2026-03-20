import type { Response } from "express";
import { prisma } from "../config/db.ts";
import crypto from "crypto";
import type { DeveloperRequest } from "../constants/types.ts";

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

const PREFIX = { PUBLISHABLE: "qlx_pub_", SECRET: "qlx_sec_" } as const;

function generateKey(type: "PUBLISHABLE" | "SECRET"): {
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const random = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  const fullKey = `${PREFIX[type]}${random}`;
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  const keyPrefix = fullKey.slice(0, 16); // e.g. "qlx_pub_a1b2c3d4"
  return { fullKey, keyHash, keyPrefix };
}

// ---------------------------------------------------------------------------
// GET /api/api-key?projectId=xxx
// Lists all active (non-revoked) keys across the developer's projects.
// Optionally filtered by projectId.
// ---------------------------------------------------------------------------

export async function listApiKeys(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    // req.query values are string | string[] | ParsedQs — normalise to string | undefined
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    // Verify ownership if a specific projectId is provided
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project || project.developerId !== developerId) {
        return res
          .status(404)
          .json({ success: false, error: "Project not found." });
      }
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        revokedAt: null,
        project: {
          developerId,
          ...(projectId ? { id: String(projectId) } : {}),
        },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        apiKeys: apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          keyPrefix: k.keyPrefix,
          type: k.type,
          lastUsedAt: k.lastUsedAt,
          createdAt: k.createdAt,
          projectId: k.projectId,
          projectName: k.project.name,
        })),
      },
    });
  } catch (error) {
    console.error("List API keys error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/api-key
// Body: { projectId: string; name: string; type: "PUBLISHABLE" | "SECRET" }
//
// Returns the plaintext key ONCE — the server only ever stores the hash.
// ---------------------------------------------------------------------------

export async function createApiKey(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { projectId, name, type = "PUBLISHABLE" } = req.body;

    // Verify developer owns the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found." });
    }

    const { fullKey, keyHash, keyPrefix } = generateKey(type);

    const apiKey = await prisma.apiKey.create({
      data: { projectId, name: name.trim(), keyHash, keyPrefix, type },
    });

    return res.status(201).json({
      success: true,
      message:
        "API key created. Copy it now — this is the only time it will be shown.",
      data: {
        // plaintext key — returned ONCE, not stored
        key: fullKey,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          type: apiKey.type,
          lastUsedAt: apiKey.lastUsedAt,
          createdAt: apiKey.createdAt,
          projectId: apiKey.projectId,
          projectName: project.name,
        },
      },
    });
  } catch (error) {
    console.error("Create API key error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/api-key/:id
// Soft-deletes the key by setting revokedAt. Fully removes from active listings.
// ---------------------------------------------------------------------------

export async function revokeApiKey(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { id } = req.params;

    if (!id) return res.status(400);

    const apiKey = await prisma.apiKey.findUnique({ where: { id: id as string } });
    if (!apiKey) {
      return res
        .status(404)
        .json({ success: false, error: "API key not found." });
    }

    // Verify the key belongs to one of this developer's projects
    const project = await prisma.project.findUnique({
      where: { id: apiKey.projectId },
      select: { developerId: true },
    });
    if (!project || project.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "API key not found." });
    }

    if (apiKey.revokedAt) {
      return res
        .status(400)
        .json({ success: false, error: "Key is already revoked." });
    }

    await prisma.apiKey.update({
      where: { id: id as string },
      data: { revokedAt: new Date() },
    });

    return res.status(200).json({ success: true, message: "API key revoked." });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
