import express from "express";
import authRoutes from "./routes/auth.ts";
import developerRoutes from "./routes/developerRoutes.ts";
import projectRoutes from "./routes/projectRoutes.ts";
import apiKeyRoutes from "./routes/apiKeyRoutes.ts";
import teamRoutes from "./routes/teamRoutes.ts";
import dashboardRoutes from "./routes/dashboardRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";
import webhookRoutes from "./routes/webhookRoutes.ts";
import sdkAuthRoutes from "./routes/sdk/sdkAuthRoutes.ts";
import sdkEmailRoutes from "./routes/sdk/sdkEmailRoutes.ts";
import sdkUserRoutes from "./routes/sdk/sdkUserRoutes.ts";
import sdk2faRoutes from "./routes/sdk/sdk2faRoutes.ts";
import sdkOAuthRoutes from "./routes/sdk/sdkOAuthRoutes.ts";
import sdkOrgRoutes from "./routes/sdk/sdkOrgRoutes.ts";
import { baseHTMLResponse } from "./constants/responseConstants.ts";
import { config } from "dotenv";
import { connectDB, disconnectDB } from "./config/db.ts";
import cron from "node-cron";
import { prisma } from "./config/db.ts";
import cors from "cors";
import cookieParser from "cookie-parser";
import { csrfProtection } from "./middlewares/csrf.ts";

const app = express();
const PORT = process.env.PORT || 8080;

config();
connectDB();

// ── Scheduled jobs ─────────────────────────────────────────────────────────

cron.schedule("0 0 * * *", async () => {
  const deleted = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`[cron] Purged ${deleted.count} expired sessions.`);
});

cron.schedule("0 1 * * *", async () => {
  const deleted = await prisma.teamInvite.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { acceptedAt: { not: null } }],
    },
  });
  console.log(`[cron] Purged ${deleted.count} stale team invites.`);
});

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS — two separate policies ───────────────────────────────────────────
//
// /sdk/* routes: open CORS — any origin may call these using a publishable
//   key. The API key itself is the auth mechanism, not the origin. This is
//   the same approach used by Supabase, Clerk, and Auth0.
//   Note: credentials: false — SDK routes do NOT use cookies. The refresh
//   token is returned in the response body and stored by the SDK.
//
// /api/* routes: restricted CORS — only the Quellix console frontend.
//   These routes manage developer accounts and require httpOnly cookies,
//   so both origin restriction and credentials: true are needed.
//
// Both policies must be registered BEFORE any route handlers.

app.use(
  "/sdk",
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

app.use(
  "/api",
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-secret"],
    credentials: true,
  }),
);

// Belt-and-suspenders: ensure credentials header is set for /api routes
// (some proxies strip it)
app.use("/api", (req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// CSRF protection — double-submit cookie on all /api/* state-mutating routes.
// GET/HEAD/OPTIONS are exempt (safe methods); all others require X-CSRF-Token
// header to match the __qlx_csrf cookie value.
// /sdk/* routes are intentionally excluded — they are key-authenticated and
// used cross-origin by design.
app.use("/api", csrfProtection);

// ── Console API routes ─────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/api-key", apiKeyRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
// Webhook management — scoped to a project; projectId comes from the route param
// e.g. GET /api/project/:projectId/webhooks
app.use("/api/project/:projectId/webhooks", webhookRoutes);

// ── SDK routes ─────────────────────────────────────────────────────────────
app.use("/sdk/auth", sdkAuthRoutes);
app.use("/sdk/auth", sdkEmailRoutes);
app.use("/sdk/auth", sdk2faRoutes);
app.use("/sdk/auth", sdkOAuthRoutes);
app.use("/sdk/user", sdkUserRoutes);
app.use("/sdk/organizations", sdkOrgRoutes);

// ── Root ────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).send(baseHTMLResponse);
});

// __ Third Party Cookies Test _______________________

app.get("/api/test/set-cookie", (req, res) => {
  const IS_PROD = process.env.NODE_ENV === "production";
  res.cookie("__qlx_xorigin_test", "1", {
    httpOnly: false, // must be readable by JS so the frontend can verify it landed
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge: 30 * 1000, // 30 seconds — self-destructs
    path: "/",
  });
  res.json({ success: true });
});

// GET /api/test/read-cookie
// Returns whether the test cookie arrived. The frontend calls this after
// set-cookie to confirm the round-trip worked.
app.get("/api/test/read-cookie", (req, res) => {
  const received = req.cookies.__qlx_xorigin_test === "1";
  // Clean up immediately
  res.clearCookie("__qlx_xorigin_test", { path: "/" });
  res.json({ crossOriginCookiesWork: received });
});

// ── Process management ──────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
  console.log(
    `[server] Console API: /api/* → origin restricted to ${process.env.FRONTEND_URL}`,
  );
  console.log(`[server] SDK API:     /sdk/* → open CORS, key-based auth`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
