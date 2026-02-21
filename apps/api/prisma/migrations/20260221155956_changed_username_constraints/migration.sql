/*
  Warnings:

  - You are about to drop the column `last_name` on the `developers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `developers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "developers" DROP COLUMN "last_name",
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "developers_username_key" ON "developers"("username");
