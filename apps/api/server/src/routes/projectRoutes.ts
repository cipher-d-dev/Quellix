// ─── projectRoutes.ts ────────────────────────────────────────────────────────
import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schema/projectValidationSchema.ts";

const router = express.Router();

router.use(requireAuth);

router.get("/", listProjects);
router.post("/", validateBody(createProjectSchema), createProject);
router.patch("/:id", validateBody(updateProjectSchema), updateProject);
router.delete("/:id", deleteProject);

export default router;
