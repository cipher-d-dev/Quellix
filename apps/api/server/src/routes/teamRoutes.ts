import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  listMembers,
  listInvites,
  sendInvite,
  cancelInvite,
  removeMember,
  getInviteInfo,
  acceptInvite,
} from "../controllers/teamController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import {
  sendInviteSchema,
  acceptInviteSchema,
} from "../schema/teamValidationSchema.ts";

const router = express.Router();

// Public — no auth required to inspect invite info (just shows sender, role)
router.get("/invites/info", getInviteInfo);

// All routes below require a valid access token
router.use(requireAuth);

router.get("/members", listMembers);
router.get("/invites", listInvites);
router.post("/invites", validateBody(sendInviteSchema), sendInvite);
router.post("/invites/accept", validateBody(acceptInviteSchema), acceptInvite);
router.delete("/invites/:id", cancelInvite);
router.delete("/members/:id", removeMember);

export default router;
