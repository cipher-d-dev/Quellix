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
import {
  changePassword,
  requestEmailChange,
  confirmEmailChange,
} from "../../controllers/sdk/sdkAccountController.ts";

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

// ── Email change (requires signed-in user) ────────────────────────────────
// Step 1: request the change — sends a code to the NEW address
router.post(
  "/email/change",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  requestEmailChange,
);

// Step 2: confirm the change — validates the code, swaps the email
router.post(
  "/email/change/confirm",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  confirmEmailChange,
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

// ── Password change (requires signed-in user) ─────────────────────────────

router.post(
  "/password/change",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  changePassword,
);

export default router;
