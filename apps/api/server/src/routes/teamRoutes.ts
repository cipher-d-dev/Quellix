import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  resolveWorkspace,
  requireOwner,
} from "../middlewares/resolveWorkspace.ts";
import {
  listMembers,
  listMemberships,
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

// Public
router.get("/invites/info", getInviteInfo);

router.use(requireAuth);

// Read — any role (resolveWorkspace so members can view the team page)
router.get("/members", resolveWorkspace, listMembers);
router.get("/invites", resolveWorkspace, listInvites);

// These are always scoped to the caller's own workspace — no resolveWorkspace needed
router.get("/memberships", listMemberships);
router.post("/invites/accept", validateBody(acceptInviteSchema), acceptInvite);

// Owner only — team management
router.post(
  "/invites",
  resolveWorkspace,
  requireOwner,
  validateBody(sendInviteSchema),
  sendInvite,
);
router.delete("/invites/:id", resolveWorkspace, requireOwner, cancelInvite);
router.delete("/members/:id", resolveWorkspace, requireOwner, removeMember);

export default router;
