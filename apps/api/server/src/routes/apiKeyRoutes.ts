import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "../controllers/apiKeyController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import { createApiKeySchema } from "../schema/apiKeyValidationSchema.ts";

const router = express.Router();

router.use(requireAuth);

router.get("/", listApiKeys);
router.post("/", validateBody(createApiKeySchema), createApiKey);
router.delete("/:id", revokeApiKey);

export default router;
