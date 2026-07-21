import express from "express";
import {
  resolveSdkKey,
  requireKeyType,
} from "../../middlewares/resolveSdkKey.ts";
import { requireEndUserAuth } from "../../middlewares/requireEndUserAuth.ts";
import { authRateLimiter } from "../../middlewares/rateLimiter.ts";
import {
  register,
  signin,
  signout,
  refresh,
  getSession,
  verifyToken,
} from "../../controllers/sdk/sdkAuthController.ts";

const router = express.Router();

// ── Publishable key routes — safe for client-side use ─────────────────────

// Register a new end user
// Rate-limited: 100 requests / 15 min per IP to prevent account creation spam
router.post(
  "/register",
  authRateLimiter,
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  register,
);

// Sign in
// Rate-limited: 100 requests / 15 min per IP to prevent brute-force attacks
router.post(
  "/signin",
  authRateLimiter,
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  signin,
);

// Refresh token rotation — does NOT require an active end-user session
// (that's the point — you call this when the access token has expired)
router.post("/refresh", resolveSdkKey, requireKeyType("PUBLISHABLE"), refresh);

// Get current session / user — requires valid access token
router.get(
  "/session",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  getSession,
);

// Sign out — requires valid access token, revokes the refresh token in body
router.post(
  "/signout",
  resolveSdkKey,
  requireKeyType("PUBLISHABLE"),
  requireEndUserAuth,
  signout,
);

// ── Secret key routes — server-to-server only ─────────────────────────────

// Verify a user's access token from your backend without sharing the secret
router.post(
  "/token/verify",
  resolveSdkKey,
  requireKeyType("SECRET"),
  verifyToken,
);

export default router;
