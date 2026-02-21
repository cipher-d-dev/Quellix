import express from "express";
import authRoutes from "./routes/auth.ts";
import { baseHTMLResponse } from "./constants/responseConstants.ts";
import { config } from "dotenv";
import { connectDB, disconnectDB } from "./config/db.ts";

const app = express();
const PORT = process.env.PORT || 8080;

config();
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
