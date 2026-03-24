import express from "express";
import authRoutes from "./routes/auth.ts";
import developerRoutes from "./routes/developerRoutes.ts";
import projectRoutes from "./routes/projectRoutes.ts";
import apiKeyRoutes from "./routes/apiKeyRoutes.ts";
import teamRoutes from "./routes/teamRoutes.ts";
import dashboardRoutes from "./routes/dashboardRoutes.ts";
import notificationRoutes from "./routes/notificationRoutes.ts";
import sdkAuthRoutes from "./routes/sdk/sdkAuthRoutes.ts";
import sdkEmailRoutes from "./routes/sdk/sdkEMailRoutes.ts";
import sdkUserRoutes from "./routes/sdk/sdkUserRoutes.ts";
import { baseHTMLResponse } from "./constants/responseConstants.ts";
import { config } from "dotenv";
import { connectDB, disconnectDB } from "./config/db.ts";
import cron from "node-cron";
import { prisma } from "./config/db.ts";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// ── Console API routes ─────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/api-key", apiKeyRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

// ── SDK routes ────────────────────────────────────────────────────────────
app.use("/sdk/auth", sdkAuthRoutes);
app.use("/sdk/auth", sdkEmailRoutes);
app.use("/sdk/user", sdkUserRoutes);

// ── Root ────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).send(baseHTMLResponse);
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
