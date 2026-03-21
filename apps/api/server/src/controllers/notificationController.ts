import type { Request, Response } from "express";
import { prisma } from "../config/db.ts";
import { Prisma } from "@prisma/client";
import type { DeveloperRequest } from "../constants/types.ts";

// ---------------------------------------------------------------------------
// Shared helper — called internally by other controllers (e.g. sendInvite).
// Non-throwing: notification failure must never block the main operation.
// ---------------------------------------------------------------------------

export async function createNotification(data: {
  developerId: string;
  type: "TEAM_INVITE" | "TEAM_ACCEPTED" | "ANNOUNCEMENT" | "SYSTEM";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        developerId: data.developerId,
        type: data.type,
        title: data.title,
        body: data.body,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("createNotification error:", error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/notifications
// Returns the 30 most recent notifications for the logged-in developer.
// Includes an unreadCount field for the badge.
// ---------------------------------------------------------------------------

export async function listNotifications(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { developerId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { developerId, read: false },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          metadata: n.metadata,
          read: n.read,
          createdAt: n.createdAt,
        })),
        unreadCount,
      },
    });
  } catch (error) {
    console.error("List notifications error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:id/read
// Marks a single notification as read.
// ---------------------------------------------------------------------------

export async function markOneRead(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });

    if (!notification || notification.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found." });
    }

    await prisma.notification.update({
      where: { id: id as string },
      data: { read: true },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all
// Marks all unread notifications as read for the logged-in developer.
// ---------------------------------------------------------------------------

export async function markAllRead(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;

    await prisma.notification.updateMany({
      where: { developerId, read: false },
      data: { read: true },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/notifications/broadcast
// Admin-only endpoint — protected by ADMIN_SECRET header.
//
// Body:
//   { title: string; body: string; type?: "ANNOUNCEMENT" | "SYSTEM";
//     targetEmail?: string }  // omit targetEmail to send to ALL developers
// ---------------------------------------------------------------------------

export async function broadcastNotification(req: Request, res: Response) {
  try {
    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: "Forbidden." });
    }

    const { title, body, type = "ANNOUNCEMENT", targetEmail } = req.body;

    if (!title || !body) {
      return res
        .status(400)
        .json({ success: false, error: "title and body are required." });
    }

    if (type !== "ANNOUNCEMENT" && type !== "SYSTEM") {
      return res
        .status(400)
        .json({
          success: false,
          error: "type must be ANNOUNCEMENT or SYSTEM.",
        });
    }

    let developerIds: string[];

    // Support both single targetEmail (legacy) and targetEmails array
    const emailList: string[] = targetEmail
      ? [targetEmail.toLowerCase().trim()]
      : Array.isArray(req.body.targetEmails)
        ? req.body.targetEmails
            .map((e: string) => e.toLowerCase().trim())
            .filter(Boolean)
        : [];

    if (emailList.length > 0) {
      const devs = await prisma.developer.findMany({
        where: { email: { in: emailList } },
        select: { id: true, email: true },
      });
      const foundEmails = devs.map((d) => d.email);
      const notFound = emailList.filter((e) => !foundEmails.includes(e));
      if (notFound.length > 0) {
        return res.status(404).json({
          success: false,
          error: `No accounts found for: ${notFound.join(", ")}`,
        });
      }
      developerIds = devs.map((d) => d.id);
    } else {
      const devs = await prisma.developer.findMany({ select: { id: true } });
      developerIds = devs.map((d) => d.id);
    }

    // createMany is more efficient than looping createNotification
    await prisma.notification.createMany({
      data: developerIds.map((developerId) => ({
        developerId,
        type,
        title,
        body,
      })),
    });

    return res.status(201).json({
      success: true,
      message: `Notification sent to ${developerIds.length} developer${developerIds.length !== 1 ? "s" : ""}.`,
      data: { count: developerIds.length },
    });
  } catch (error) {
    console.error("Broadcast notification error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/notifications/paginated?page=1&limit=10
// Paginated list for the notifications management page.
// ---------------------------------------------------------------------------

export async function listNotificationsPaginated(
  req: DeveloperRequest,
  res: Response,
) {
  try {
    const developerId = req.developer!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { developerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { developerId } }),
      prisma.notification.count({ where: { developerId, read: false } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          metadata: n.metadata,
          read: n.read,
          createdAt: n.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (error) {
    console.error("List notifications paginated error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/notifications/:id
// Deletes a single notification.
// ---------------------------------------------------------------------------

export async function deleteNotification(req: DeveloperRequest, res: Response) {
  try {
    const developerId = req.developer!.id;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: id as string },
    });
    if (!notification || notification.developerId !== developerId) {
      return res
        .status(404)
        .json({ success: false, error: "Notification not found." });
    }

    await prisma.notification.delete({ where: { id: id as string } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/notifications
// Deletes all notifications for the logged-in developer.
// ---------------------------------------------------------------------------

export async function deleteAllNotifications(
  req: DeveloperRequest,
  res: Response,
) {
  try {
    const developerId = req.developer!.id;
    await prisma.notification.deleteMany({ where: { developerId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/developers/search?q=xxx
// Admin-only — returns developer emails matching the query for autocomplete.
// ---------------------------------------------------------------------------

export async function searchDevelopers(req: Request, res: Response) {
  try {
    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: "Forbidden." });
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q)
      return res.status(200).json({ success: true, data: { developers: [] } });

    const developers = await prisma.developer.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { fullName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { email: true, fullName: true },
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, data: { developers } });
  } catch (error) {
    console.error("Search developers error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong." });
  }
}
