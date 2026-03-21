import type { Response } from "express";
import { prisma } from "../config/db.ts";
import type { DeveloperRequest } from "../constants/types.ts";

// GET /api/dashboard/stats — any role
export async function getDashboardStats(req: DeveloperRequest, res: Response) {
  try {
    const ownerId = req.workspaceOwnerId!;

    const [
      projectCount,
      apiKeyCount,
      endUserCount,
      authEventCount,
      recentProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { developerId: ownerId } }),
      prisma.apiKey.count({
        where: { revokedAt: null, project: { developerId: ownerId } },
      }),
      prisma.endUser.count({ where: { project: { developerId: ownerId } } }),
      prisma.authEvent.count({ where: { project: { developerId: ownerId } } }),
      prisma.project.findMany({
        where: { developerId: ownerId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const recentProjectsWithCounts = await Promise.all(
      recentProjects.map(async (p) => {
        const [keyCount, userCount] = await Promise.all([
          prisma.apiKey.count({ where: { projectId: p.id, revokedAt: null } }),
          prisma.endUser.count({ where: { projectId: p.id } }),
        ]);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          createdAt: p.createdAt,
          keyCount,
          userCount,
        };
      }),
    );

    const recentEvents = await prisma.authEvent.findMany({
      where: { project: { developerId: ownerId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        createdAt: true,
        ipAddress: true,
        metadata: true,
        project: { select: { name: true } },
        endUser: { select: { email: true } },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          projects: projectCount,
          apiKeys: apiKeyCount,
          endUsers: endUserCount,
          authEvents: authEventCount,
        },
        recentProjects: recentProjectsWithCounts,
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          type: e.type,
          createdAt: e.createdAt,
          ipAddress: e.ipAddress,
          projectName: e.project?.name ?? null,
          userEmail: e.endUser?.email ?? null,
          metadata: e.metadata,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
