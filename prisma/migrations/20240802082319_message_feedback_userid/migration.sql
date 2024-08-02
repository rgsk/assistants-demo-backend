/*
  Warnings:

  - Added the required column `userId` to the `MessageFeedback` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MessageFeedback" ADD COLUMN     "userId" TEXT NOT NULL;
