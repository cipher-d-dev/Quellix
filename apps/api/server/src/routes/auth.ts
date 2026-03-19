import express from "express";
import {
  login,
  logout,
  register,
  refresh,
  forgotPassword,
  resetPassword,
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
} from "../schema/developerValidationSchema.ts";

const router = express.Router();

// ── Credentials ───────────────────────────────────────────────────────────
router.post("/register", validateBody(developerSignupSchema), register);
router.post("/login", validateBody(developerSigninSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);

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
