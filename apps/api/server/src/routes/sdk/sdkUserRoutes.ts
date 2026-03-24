import express from "express";
import {
  resolveSdkKey,
  requireKeyType,
} from "../../middlewares/resolveSdkKey.ts";
import { requireEndUserAuth } from "../../middlewares/requireEndUserAuth.ts";
import {
  getMe,
  updateMe,
  deleteMe,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  revokeUserSessions,
} from "../../controllers/sdk/sdkUserController.ts";

const router = express.Router();

// ── /sdk/user — end user operates on their own account ────────────────────
// Every route here requires a valid end-user access token in addition
// to the publishable key.

router.get(
  "/me",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  getMe,
);

router.patch(
  "/me",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  updateMe,
);

router.delete(
  "/me",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  deleteMe,
);

// ── /sdk/users — developer's backend manages users ────────────────────────
// Secret key only. Never expose these in client-side code.

router.get("/", resolveSdkKey, requireKeyType("SECRET"), listUsers);

router.get("/:id", resolveSdkKey, requireKeyType("SECRET"), getUser);

router.patch("/:id", resolveSdkKey, requireKeyType("SECRET"), updateUser);

router.delete("/:id", resolveSdkKey, requireKeyType("SECRET"), deleteUser);

router.delete(
  "/:id/sessions",
  resolveSdkKey,
  requireKeyType("SECRET"),
  revokeUserSessions,
);

export default router;
