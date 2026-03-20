import type { Response } from "express";
import { prisma } from "../config/db.ts";
import type { DeveloperRequest } from "../constants/types.ts";

// ---------------------------------------------------------------------------
// GET /api/dashboard/stats
// Returns high-level counts scoped to the authenticated developer's workspace.
// ---------------------------------------------------------------------------

export async function getDashboardStats(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;

    // Fetch everything in a single round-trip with Promise.all
    const [
      projectCount,
      apiKeyCount,
      endUserCount,
      authEventCount,
      recentProjects,
    ] = await Promise.all([
      // Total projects owned by this developer
      prisma.project.count({ where: { developerId } }),

      // Active (non-revoked) API keys across all developer's projects
      prisma.apiKey.count({
        where: { revokedAt: null, project: { developerId } },
      }),

      // Total end users across all developer's projects
      prisma.endUser.count({ where: { project: { developerId } } }),

      // Auth events for the developer's projects
      prisma.authEvent.count({ where: { project: { developerId } } }),

      // Last 5 projects for the "Recent Projects" panel
      prisma.project.findMany({
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
        take: 5,
      }),
    ]);

    // Last 10 auth events for the "Auth Events" live panel
    const recentEvents = await prisma.authEvent.findMany({
      where: { project: { developerId } },
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
        recentProjects: recentProjects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          createdAt: p.createdAt,
          keyCount: p._count.apiKeys,
          userCount: p._count.endUsers,
        })),
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
