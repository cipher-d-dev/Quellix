import express from "express";
import {
  resolveSdkKey,
  requireKeyType,
} from "../../middlewares/resolveSdkKey.ts";
import { requireEndUserAuth } from "../../middlewares/requireEndUserAuth.ts";
import {
  setup2fa,
  enable2fa,
  disable2fa,
  verify2fa,
} from "../../controllers/sdk/sdk2faController.ts";
import { totpVerifyRateLimiter } from "../../middlewares/rateLimiter.ts";

const router = express.Router();

// Enforce publishable key validation globally for these routes
router.use(resolveSdkKey);
router.use(requireKeyType("PUBLISHABLE"));

// 2FA Verification (no user login session required - uses transient 2faToken)
// Rate-limited to prevent brute forcing
router.post("/2fa/verify", totpVerifyRateLimiter, verify2fa);

// 2FA Setup/Enable/Disable (requires authenticated session)
router.post("/2fa/setup", requireEndUserAuth, setup2fa);
router.post("/2fa/enable", requireEndUserAuth, enable2fa);
router.post("/2fa/disable", requireEndUserAuth, disable2fa);

export default router;
