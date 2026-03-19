import express from "express";
import {
  login,
  logout,
  register,
  refresh,
  forgotPassword,
  resetPassword,
  confirmLinkPassword,
} from "../controllers/authController.ts";
import {
  verifyEmail,
  resendVerification,
} from "../controllers/emailVerificationController.ts";
import {
  redirectToGitHub,
  handleGitHubCallback,
} from "../controllers/githubOAuthController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import {
  developerSigninSchema,
  developerSignupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  confirmLinkPasswordSchema,
} from "../schema/developerValidationSchema.ts";

const router = express.Router();

// ── Credentials ───────────────────────────────────────────────────────────
router.post("/register", validateBody(developerSignupSchema), register);
router.post("/login", validateBody(developerSigninSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);

// ── Account linking ───────────────────────────────────────────────────────
// Called after the user enters the inbox-verification code issued during a
// register() ACCOUNT_LINKABLE collision. Adds password login to an existing
// OAuth-only account after proving inbox ownership.
router.post(
  "/link-password",
  validateBody(confirmLinkPasswordSchema),
  confirmLinkPassword,
);

// ── GitHub OAuth ──────────────────────────────────────────────────────────
router.get("/github", redirectToGitHub);
router.get("/github/callback", handleGitHubCallback);

// ── Password reset ────────────────────────────────────────────────────────
router.post(
  "/forgot-password",
  validateBody(passwordResetRequestSchema),
  forgotPassword,
);
router.post(
  "/reset-password",
  validateBody(passwordResetSchema),
  resetPassword,
);

// ── Email verification ────────────────────────────────────────────────────
router.post("/verify-email", validateBody(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-verification",
  validateBody(resendVerificationSchema),
  resendVerification,
);

export default router;
