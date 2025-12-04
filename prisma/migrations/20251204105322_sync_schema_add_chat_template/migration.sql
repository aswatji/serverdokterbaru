-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "pushToken" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "image" TEXT,
ADD COLUMN     "isRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushToken" TEXT;

-- CreateTable
CREATE TABLE "ChatTemplate" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatTemplate_doctorId_idx" ON "ChatTemplate"("doctorId");

-- CreateIndex
CREATE INDEX "ChatTemplate_category_idx" ON "ChatTemplate"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ChatTemplate_doctorId_category_title_key" ON "ChatTemplate"("doctorId", "category", "title");

-- AddForeignKey
ALTER TABLE "ChatTemplate" ADD CONSTRAINT "ChatTemplate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
