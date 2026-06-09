import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  resolveWorkspace,
  requireWriteAccess,
} from "../middlewares/resolveWorkspace.ts";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getAttempts,
} from "../controllers/webhookController.ts";
import { webhookTestRateLimiter } from "../middlewares/rateLimiter.ts";

const router = express.Router({ mergeParams: true });

// Require developer authentication globally for console routes
router.use(requireAuth);

// Read webhooks & attempts (resolveWorkspace allows any role in workspace to read)
router.get("/", resolveWorkspace, listWebhooks);
router.get("/:webhookId/attempts", resolveWorkspace, getAttempts);

// Write actions (requireWriteAccess restricts to Admins and Owners)
router.post("/", resolveWorkspace, requireWriteAccess, createWebhook);
router.patch("/:webhookId", resolveWorkspace, requireWriteAccess, updateWebhook);
router.delete("/:webhookId", resolveWorkspace, requireWriteAccess, deleteWebhook);

// Webhook test firing (rate-limited to protect endpoints)
router.post(
  "/:webhookId/test",
  resolveWorkspace,
  requireWriteAccess,
  webhookTestRateLimiter,
  testWebhook
);

export default router;
