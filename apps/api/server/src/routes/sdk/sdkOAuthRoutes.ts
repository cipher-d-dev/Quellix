import express from "express";
import {
  authorize,
  callback,
  exchangeOAuthCode,
} from "../../controllers/sdk/sdkOAuthController.ts";
import { authRateLimiter } from "../../middlewares/rateLimiter.ts";

const router = express.Router();

// Initiate OAuth flow — browser is redirected to the provider
router.get("/oauth/:provider/authorize", authorize);

// Provider callback — exchanges provider code, issues one-time Quellix code
// Rate-limited to prevent callback replay abuse
router.get("/oauth/:provider/callback", authRateLimiter, callback);

// One-time code exchange — SDK calls this immediately after the redirect
// lands to swap the short-lived code for actual access + refresh tokens.
// Rate-limited: prevents brute-force enumeration of codes.
router.get("/oauth/exchange", authRateLimiter, exchangeOAuthCode);

export default router;
