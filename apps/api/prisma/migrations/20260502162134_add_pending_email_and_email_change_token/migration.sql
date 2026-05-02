-- AlterEnum
ALTER TYPE "TokenType" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "end_users" ADD COLUMN     "pending_email" TEXT;
