import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import { resolveWorkspace } from "../middlewares/resolveWorkspace.ts";
import { getDashboardStats } from "../controllers/dashboardController.ts";

const router = express.Router();

router.use(requireAuth);
router.get("/stats", resolveWorkspace, getDashboardStats);

export default router;
