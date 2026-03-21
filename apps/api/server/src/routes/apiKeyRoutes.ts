import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  resolveWorkspace,
  requireWriteAccess,
} from "../middlewares/resolveWorkspace.ts";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "../controllers/apiKeyController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import { createApiKeySchema } from "../schema/apiKeyValidationSchema.ts";

const router = express.Router();

router.use(requireAuth);

// Any role can read
router.get("/", resolveWorkspace, listApiKeys);

// Admin + owner can create and revoke
router.post(
  "/",
  resolveWorkspace,
  requireWriteAccess,
  validateBody(createApiKeySchema),
  createApiKey,
);
router.delete("/:id", resolveWorkspace, requireWriteAccess, revokeApiKey);

export default router;
