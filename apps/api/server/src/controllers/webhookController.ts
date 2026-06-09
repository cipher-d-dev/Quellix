import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/db.ts";
import { enqueueWebhookEvent } from "../utils/webhookDispatcher.ts";

/**
 * List webhooks for a project.
 * GET /api/project/:projectId/webhooks
 */
export async function listWebhooks(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId;

    const webhooks = await prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error("[Webhook Controller] List error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Create a new webhook.
 * POST /api/project/:projectId/webhooks
 */
export async function createWebhook(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId;
    const { url, events } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: "url (string) and events (array of strings) are required.",
      });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL format." });
    }

    // Generate secure random secret prefixed with whsec_
    const secret = "whsec_" + crypto.randomBytes(24).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        projectId,
        url,
        events,
        secret,
        enabled: true,
      },
    });

    return res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error("[Webhook Controller] Create error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Update webhook settings.
 * PATCH /api/project/:projectId/webhooks/:webhookId
 */
export async function updateWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;
    const { url, events, enabled } = req.body;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: "Webhook not found." });
    }

    const data: any = {};
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ success: false, error: "Invalid URL format." });
      }
      data.url = url;
    }
    if (events && Array.isArray(events)) {
      data.events = events;
    }
    if (typeof enabled === "boolean") {
      data.enabled = enabled;
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Webhook Controller] Update error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Delete a webhook.
 * DELETE /api/project/:projectId/webhooks/:webhookId
 */
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: "Webhook not found." });
    }

    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    return res.json({ success: true, message: "Webhook deleted successfully." });
  } catch (error) {
    console.error("[Webhook Controller] Delete error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Test fire a webhook.
 * POST /api/project/:projectId/webhooks/:webhookId/test
 */
export async function testWebhook(req: Request, res: Response) {
  try {
    const { webhookId, projectId } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: "Webhook not found." });
    }

    // Enqueue a mock ping event to the dispatcher queue
    enqueueWebhookEvent(projectId, "test.ping", {
      message: "Hello from Quellix Webhooks!",
      timestamp: new Date().toISOString(),
      test: true,
    });

    return res.json({
      success: true,
      message: "Test event enqueued successfully. Check delivery attempts in a moment.",
    });
  } catch (error) {
    console.error("[Webhook Controller] Test error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * List delivery attempts for a webhook.
 * GET /api/project/:projectId/webhooks/:webhookId/attempts
 */
export async function getAttempts(req: Request, res: Response) {
  try {
    const { webhookId } = req.params;

    const attempts = await prisma.webhookAttempt.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      take: 50, // Return latest 50 attempts
    });

    return res.json({ success: true, data: attempts });
  } catch (error) {
    console.error("[Webhook Controller] List attempts error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
