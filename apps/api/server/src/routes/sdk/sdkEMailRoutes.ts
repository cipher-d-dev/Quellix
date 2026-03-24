import express from "express";
import {
  resolveSdkKey,
  requireKeyType,
} from "../../middlewares/resolveSdkKey.ts";
import { requireEndUserAuth } from "../../middlewares/requireEndUserAuth.ts";
import {
  sendEmailVerification,
  confirmEmailVerification,
  requestPasswordReset,
  confirmPasswordReset,
} from "../../controllers/sdk/sdkEmailController.ts";

const router = express.Router();

// ── Email verification (requires signed-in user) ──────────────────────────

router.post(
  "/email/verify/send",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  sendEmailVerification,
);

router.post(
  "/email/verify/confirm",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  confirmEmailVerification,
);

// ── Password reset (no auth — user is locked out) ─────────────────────────

router.post(
  "/password/reset",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requestPasswordReset,
);

router.post(
  "/password/reset/confirm",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  confirmPasswordReset,
);

export default router;
