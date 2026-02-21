/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('PUBLISHABLE', 'SECRET');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TWO_FACTOR');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "developers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "developer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "type" "ApiKeyType" NOT NULL DEFAULT 'PUBLISHABLE',
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_users" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "profile_image_url" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "last_sign_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_backup_codes" (
    "id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "end_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_attempts" (
    "id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status_code" INTEGER,
    "response" TEXT,
    "succeeded_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developers_email_key" ON "developers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_developer_id_idx" ON "projects"("developer_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_project_id_idx" ON "api_keys"("project_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "end_users_project_id_idx" ON "end_users"("project_id");

-- CreateIndex
CREATE INDEX "end_users_email_idx" ON "end_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "end_users_project_id_email_key" ON "end_users"("project_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_end_user_id_idx" ON "sessions"("end_user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "social_accounts_end_user_id_idx" ON "social_accounts"("end_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "two_factor_backup_codes_end_user_id_idx" ON "two_factor_backup_codes"("end_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_end_user_id_idx" ON "verification_tokens"("end_user_id");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_project_id_idx" ON "organizations"("project_id");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_end_user_id_idx" ON "organization_members"("end_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_end_user_id_key" ON "organization_members"("organization_id", "end_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_token_key" ON "organization_invites"("token");

-- CreateIndex
CREATE INDEX "organization_invites_organization_id_idx" ON "organization_invites"("organization_id");

-- CreateIndex
CREATE INDEX "organization_invites_token_idx" ON "organization_invites"("token");

-- CreateIndex
CREATE INDEX "webhooks_project_id_idx" ON "webhooks"("project_id");

-- CreateIndex
CREATE INDEX "webhook_attempts_webhook_id_idx" ON "webhook_attempts"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_attempts_created_at_idx" ON "webhook_attempts"("created_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_backup_codes" ADD CONSTRAINT "two_factor_backup_codes_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_attempts" ADD CONSTRAINT "webhook_attempts_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
