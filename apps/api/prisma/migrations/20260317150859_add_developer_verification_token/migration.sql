/*
  Warnings:

  - You are about to drop the column `first_name` on the `developers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "developers" DROP COLUMN "first_name",
ADD COLUMN     "full_name" TEXT;

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "developer_id" TEXT,
ALTER COLUMN "end_user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "verification_tokens_developer_id_idx" ON "verification_tokens"("developer_id");

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
