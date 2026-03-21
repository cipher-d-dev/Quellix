import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  listNotifications,
  searchDevelopers,
  listNotificationsPaginated,
  markOneRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
  broadcastNotification,
} from "../controllers/NotificationController.ts";

const router = express.Router();

// Admin routes — protected by ADMIN_SECRET header
router.post("/admin/broadcast", broadcastNotification);
router.get("/admin/developers/search", searchDevelopers);

// Developer-facing routes
router.use(requireAuth);
router.get("/", listNotifications); // bell dropdown (last 30)
router.get("/paginated", listNotificationsPaginated); // full page with pagination
router.patch("/read-all", markAllRead);
router.delete("/", deleteAllNotifications);
router.patch("/:id/read", markOneRead);
router.delete("/:id", deleteNotification);

export default router;
