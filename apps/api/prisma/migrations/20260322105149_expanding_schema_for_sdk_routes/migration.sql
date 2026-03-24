/*
  Warnings:

  - A unique constraint covering the columns `[project_id,external_id]` on the table `end_users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "end_users" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "project_id" TEXT;

-- CreateTable
CREATE TABLE "project_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "allowed_origins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_callback_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allow_signups" BOOLEAN NOT NULL DEFAULT true,
    "require_email_verification" BOOLEAN NOT NULL DEFAULT false,
    "block_disposable_emails" BOOLEAN NOT NULL DEFAULT false,
    "enabled_auth_providers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "password_min_length" INTEGER NOT NULL DEFAULT 8,
    "password_require_uppercase" BOOLEAN NOT NULL DEFAULT false,
    "password_require_number" BOOLEAN NOT NULL DEFAULT false,
    "password_require_symbol" BOOLEAN NOT NULL DEFAULT false,
    "session_duration_days" INTEGER NOT NULL DEFAULT 30,
    "jwt_duration_seconds" INTEGER NOT NULL DEFAULT 900,
    "max_sessions_per_user" INTEGER,
    "custom_email_from_name" TEXT,
    "custom_email_from_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_project_id_key" ON "project_settings"("project_id");

-- CreateIndex
CREATE INDEX "end_users_external_id_idx" ON "end_users"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "end_users_project_id_external_id_key" ON "end_users"("project_id", "external_id");

-- CreateIndex
CREATE INDEX "sessions_project_id_idx" ON "sessions"("project_id");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_idx" ON "sessions"("refresh_token");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
