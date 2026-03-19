import express from "express";
import authRoutes from "./routes/auth.ts";
import { baseHTMLResponse } from "./constants/responseConstants.ts";
import { config } from "dotenv";
import { connectDB, disconnectDB } from "./config/db.ts";
import cron from "node-cron";
import { prisma } from "./config/db.ts";
import cors from 'cors';
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 8080;

config();
connectDB();

// runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
})

// API ROUTES
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.status(200).send(baseHTMLResponse);
});

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
