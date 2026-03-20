import express from "express";
import authRoutes from "./routes/auth.ts";
import developerRoutes from "./routes/developerRoutes.ts";
import projectRoutes from "./routes/projectRoutes.ts";
import apiKeyRoutes from "./routes/apiKeyRoutes.ts";
import teamRoutes from "./routes/teamRoutes.ts";
import dashboardRoutes from "./routes/dashboardRoutes.ts";
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

// Purge expired sessions every day at midnight
cron.schedule("0 0 * * *", async () => {
  const deleted = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`[cron] Purged ${deleted.count} expired sessions.`);
});

// Purge expired and accepted team invites every day at 01:00
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
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "UPDATE", "PATCH", "DELETE"],
    credentials: true,
  }),
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/api-key", apiKeyRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── Root ────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.status(200).send(baseHTMLResponse);
});

// ── Process management ──────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
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
