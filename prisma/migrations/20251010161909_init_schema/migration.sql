/*
  Warnings:

  - You are about to drop the column `consultationId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the `Consultation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[chatKey]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chatKey` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctorId` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_consultationId_fkey";

-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_paymentId_fkey";

-- DropIndex
DROP INDEX "Chat_consultationId_key";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "consultationId",
ADD COLUMN     "chatKey" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Consultation";

-- DropTable
DROP TABLE "Payment";

-- CreateIndex
CREATE UNIQUE INDEX "Chat_chatKey_key" ON "Chat"("chatKey");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
