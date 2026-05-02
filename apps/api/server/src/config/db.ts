import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Connection pool
//
// We pass a configured pg.Pool to PrismaPg rather than a raw connection
// string so we control idle timeouts.
//
// Why this matters in production (Render, Railway, Supabase, etc.):
//   Managed Postgres servers close idle connections server-side, typically
//   after 5–10 minutes. If Prisma's pool holds onto a connection longer than
//   that, the next query on that connection throws P1017 "Server has closed
//   the connection."
//
//   Setting idleTimeoutMillis well below the server's cutoff means the pool
//   retires its own connections first — so every query always gets a live one.
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Retire idle connections after 30 seconds. Render's Postgres cuts idle
  // connections at ~5 minutes, so this keeps us well clear of that limit.
  idleTimeoutMillis: 30_000,

  // Fail fast if the pool can't acquire a connection within 10 seconds
  // rather than hanging a request indefinitely.
  connectionTimeoutMillis: 10_000,

  // Allow up to 10 concurrent connections. Adjust down if you're on a plan
  // with a low connection limit (Render free tier: 5 max).
  max: IS_PROD ? 10 : 3,

  // Render Postgres requires SSL in production. rejectUnauthorized: false
  // trusts Render's self-signed cert — acceptable for managed PaaS, where
  // the cert is controlled by the platform.
  ssl: IS_PROD ? { rejectUnauthorized: false } : false,
});

// Surface pool-level errors (e.g. bad credentials, DNS failures) so they
// appear in logs rather than silently swallowing as unhandled promise rejections.
pool.on("error", (err) => {
  console.error("[pg pool] Unexpected error on idle client:", err);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  adapter,
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
  await pool.end();
};

export { connectDB, disconnectDB, prisma };