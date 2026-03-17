-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "developer_id" TEXT,
ALTER COLUMN "end_user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "sessions_developer_id_idx" ON "sessions"("developer_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
