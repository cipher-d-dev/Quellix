import express from "express";
import {
  resolveSdkKey,
  requireKeyType,
} from "../../middlewares/resolveSdkKey.ts";
import { requireEndUserAuth } from "../../middlewares/requireEndUserAuth.ts";
import {
  createOrg,
  listMyOrgs,
  getOrg,
  updateOrg,
  deleteOrg,
  listMembers,
  inviteMember,
  acceptInvite,
  removeMember,
} from "../../controllers/sdk/sdkOrgController.ts";
import { authRateLimiter } from "../../middlewares/rateLimiter.ts";

const router = express.Router();

// Enforce SDK validation and end-user authentication on all routes
router.use(resolveSdkKey);
router.use(requireKeyType("PUBLISHABLE"));
router.use(requireEndUserAuth);

// Org CRUD
router.post("/", createOrg);
router.get("/", listMyOrgs);
router.get("/:id", getOrg);
router.patch("/:id", updateOrg);
router.delete("/:id", deleteOrg);

// Member list & administration
router.get("/:id/members", listMembers);
router.delete("/:id/members/:userId", removeMember);

// Invitations (accepting invites is rate-limited)
router.post("/:id/invites", inviteMember);
router.post("/invites/:token/accept", authRateLimiter, acceptInvite);

export default router;
