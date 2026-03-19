/*
  Warnings:

  - A unique constraint covering the columns `[github_id]` on the table `developers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "developers" ADD COLUMN     "auth_provider" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "github_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "developers_github_id_key" ON "developers"("github_id");
