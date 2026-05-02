import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  resolveWorkspace,
  requireWriteAccess,
  requireOwner,
} from "../middlewares/resolveWorkspace.ts";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.ts";
import {
  getProjectSettings,
  updateProjectSettings,
} from "../controllers/projectSettingsController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schema/projectValidationSchema.ts";
import { updateProjectSettingsSchema } from "../schema/projectSettingsValidationSchema.ts";

const router = express.Router();

router.use(requireAuth);

// ── Project CRUD ───────────────────────────────────────────────────────────

// Any role can read
router.get("/", resolveWorkspace, listProjects);

// Admin + owner can create and rename
router.post(
  "/",
  resolveWorkspace,
  requireWriteAccess,
  validateBody(createProjectSchema),
  createProject,
);
router.patch(
  "/:id",
  resolveWorkspace,
  requireWriteAccess,
  validateBody(updateProjectSchema),
  updateProject,
);

// Only owner can delete
router.delete("/:id", resolveWorkspace, requireOwner, deleteProject);

// ── Project Settings ───────────────────────────────────────────────────────
//
// GET  /api/project/:id/settings — any role (reads SDK config)
// PATCH /api/project/:id/settings — admin + owner only

router.get("/:id/settings", resolveWorkspace, getProjectSettings);
router.patch(
  "/:id/settings",
  resolveWorkspace,
  requireWriteAccess,
  validateBody(updateProjectSettingsSchema),
  updateProjectSettings,
);

export default router;
