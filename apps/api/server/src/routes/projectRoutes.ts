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
import { validateBody } from "../middlewares/validateBody.ts";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schema/projectValidationSchema.ts";

const router = express.Router();

router.use(requireAuth);

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

export default router;
