import type { Response } from "express";
import { prisma } from "../config/db.ts";
import crypto from "crypto";
import type { DeveloperRequest } from "../constants/types.ts";

const PREFIX = { PUBLISHABLE: "qlx_pub_", SECRET: "qlx_sec_" } as const;

function generateKey(type: "PUBLISHABLE" | "SECRET"): {
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const random = crypto.randomBytes(24).toString("hex");
  const fullKey = `${PREFIX[type]}${random}`;
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  const keyPrefix = fullKey.slice(0, 16);
  return { fullKey, keyHash, keyPrefix };
}

// GET /api/api-key — any role
export async function listApiKeys(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.workspaceOwnerId!;
    const projectId =
      typeof req.query.projectId === "string" ? req.query.projectId : undefined;

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project || project.developerId !== ownerId) {
        return res
          .status(404)
          .json({ success: false, error: "Project not found." });
      }
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        revokedAt: null,
        project: {
          developerId: ownerId,
          ...(projectId ? { id: projectId } : {}),
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

// POST /api/api-key — admin + owner only
export async function createApiKey(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.workspaceOwnerId!;
    const { projectId, name, type = "PUBLISHABLE" } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.developerId !== ownerId) {
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

// DELETE /api/api-key/:id — admin + owner only
export async function revokeApiKey(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.workspaceOwnerId!;
    const { id } = req.params;

    const apiKey = await prisma.apiKey.findUnique({ where: { id: id as string } });
    if (!apiKey) {
      return res
        .status(404)
        .json({ success: false, error: "API key not found." });
    }

    const project = await prisma.project.findUnique({
      where: { id: apiKey.projectId },
      select: { developerId: true },
    });
    if (!project || project.developerId !== ownerId) {
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
