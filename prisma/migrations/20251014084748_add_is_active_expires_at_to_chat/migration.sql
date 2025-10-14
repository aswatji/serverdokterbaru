-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;
