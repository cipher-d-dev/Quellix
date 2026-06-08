import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Point to your schema file (relative to this file)
  schema: "./prisma/schema.prisma",

  migrations: {
    path: "./prisma/migrations",
  },

  datasource: {
    // This is where the CLI (migrate, db push) gets its connection URL
    url: env("DIRECT_URL"),
  },
});
