// ─── dashboardRoutes.ts ──────────────────────────────────────────────────────
import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import { getDashboardStats } from "../controllers/dashboardController.ts";

const router = express.Router();

router.use(requireAuth);
router.get("/stats", getDashboardStats);

export default router;
