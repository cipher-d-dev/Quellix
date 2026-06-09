import express from "express";
import { authorize, callback } from "../../controllers/sdk/sdkOAuthController.ts";
import { authRateLimiter } from "../../middlewares/rateLimiter.ts";

const router = express.Router();

// Route to initiate OAuth flow (client-side triggers redirect)
router.get("/oauth/:provider/authorize", authorize);

// Route for OAuth provider callback (rate-limited)
router.get("/oauth/:provider/callback", authRateLimiter, callback);

export default router;
