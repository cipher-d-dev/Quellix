import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg"; // You must import the 'pg' library
import "dotenv/config";

// 1. Create the pg Pool instance
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Pass the pool instance to the PrismaPg adapter
const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  adapter,
});

const connectDB = async () => {
  try {
    // In Prisma 7 with adapters, $connect() verifies the driver connection
    await prisma.$connect();
    console.log("Database connected successfully via Prisma 7 Adapter");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
  // Best practice: also close the underlying pool
  await pool.end();
};

export { connectDB, disconnectDB, prisma };
