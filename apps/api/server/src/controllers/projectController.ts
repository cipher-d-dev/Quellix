import type { Response } from "express";
import { prisma } from "../config/db.ts";
import type { DeveloperRequest } from "../constants/types.ts";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (await prisma.project.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

// ---------------------------------------------------------------------------
// GET /api/project
// Returns all projects for the authenticated developer with key + user counts.
// ---------------------------------------------------------------------------

export async function listProjects(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;

    const projects = await prisma.project.findMany({
      where: { developerId },
      include: {
        _count: {
          select: {
            apiKeys: { where: { revokedAt: null } },
            endUsers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          logoUrl: p.logoUrl,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          keyCount: p._count.apiKeys,
          userCount: p._count.endUsers,
        })),
      },
    });
  } catch (error) {
    console.error("List projects error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/project
// Body: { name: string }
// ---------------------------------------------------------------------------

export async function createProject(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { name } = req.body;

    const base = slugify(name);
    if (!base) {
      return res.status(400).json({
        success: false,
        error: "Project name produced an empty slug.",
      });
    }

    const slug = await uniqueSlug(base);

    const project = await prisma.project.create({
      data: { developerId, name: name.trim(), slug },
      include: {
        _count: { select: { apiKeys: true, endUsers: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Project created.",
      data: {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          logoUrl: project.logoUrl,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          keyCount: project._count.apiKeys,
          userCount: project._count.endUsers,
        },
      },
    });
  } catch (error) {
    console.error("Create project error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/project/:id
// Body: { name?: string }
// ---------------------------------------------------------------------------

export async function updateProject(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { id } = req.params;
    const { name } = req.body;

    const project = await prisma.project.findUnique({ where: { id: id as string } });
    if (!project || project.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found." });
    }

    const updated = await prisma.project.update({
      where: { id: id as string},
      data: { ...(name ? { name: name.trim() } : {}) },
      include: {
        _count: {
          select: {
            apiKeys: { where: { revokedAt: null } },
            endUsers: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Project updated.",
      data: {
        project: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          logoUrl: updated.logoUrl,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          keyCount: updated._count.apiKeys,
          userCount: updated._count.endUsers,
        },
      },
    });
  } catch (error) {
    console.error("Update project error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/project/:id
// Cascades to apiKeys, endUsers, sessions, authEvents via Prisma onDelete.
// ---------------------------------------------------------------------------

export async function deleteProject(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { id } = req.params;

    if (!id) return res.status(400);

    const project = await prisma.project.findUnique({ where: { id: id as string } });
    if (!project || project.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "Project not found." });
    }

    await prisma.project.delete({ where: { id: id as string } });

    return res.status(200).json({ success: true, message: "Project deleted." });
  } catch (error) {
    console.error("Delete project error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
