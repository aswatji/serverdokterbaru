/*
  Warnings:

  - A unique constraint covering the columns `[chatId,date]` on the table `ChatDate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChatUnread" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT,
    "doctorId" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUnread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatUnread_userId_idx" ON "ChatUnread"("userId");

-- CreateIndex
CREATE INDEX "ChatUnread_doctorId_idx" ON "ChatUnread"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatUnread_chatId_userId_key" ON "ChatUnread"("chatId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatUnread_chatId_doctorId_key" ON "ChatUnread"("chatId", "doctorId");

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- CreateIndex
CREATE INDEX "Chat_doctorId_idx" ON "Chat"("doctorId");

-- CreateIndex
CREATE INDEX "ChatDate_chatId_idx" ON "ChatDate"("chatId");

-- CreateIndex
CREATE INDEX "ChatDate_date_idx" ON "ChatDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ChatDate_chatId_date_key" ON "ChatDate"("chatId", "date");

-- CreateIndex
CREATE INDEX "ChatMessage_chatDateId_idx" ON "ChatMessage"("chatDateId");

-- CreateIndex
CREATE INDEX "ChatMessage_sentAt_idx" ON "ChatMessage"("sentAt");

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
