/*
  Warnings:

  - You are about to drop the column `name` on the `Doctor` table. All the data in the column will be lost.
  - You are about to drop the column `specialty` on the `Doctor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[strNumber]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullname` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strNumber` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `university` to the `Doctor` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add new columns with default values
ALTER TABLE "Doctor" ADD COLUMN "fullname" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "category" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "university" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "strNumber" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "gender" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "email" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "password" TEXT;

-- Step 2: Migrate existing data for each doctor manually
UPDATE "Doctor" SET 
  "fullname" = "name",
  "category" = "specialty",
  "university" = 'Universitas Indonesia',
  "strNumber" = 'STR-0001',
  "gender" = 'male',
  "email" = 'doctor1@example.com',
  "password" = '$2b$12$XVDd3Y6yFGK9nNJKCXrY8OgKjO1QJH2K5Y6zFGKwKjO1QJH2K5Y6zF'
WHERE "name" = 'Dr. Ahmad Sutanto';

UPDATE "Doctor" SET 
  "fullname" = "name",
  "category" = "specialty",
  "university" = 'Universitas Gadjah Mada',
  "strNumber" = 'STR-0002',
  "gender" = 'female',
  "email" = 'doctor2@example.com',
  "password" = '$2b$12$XVDd3Y6yFGK9nNJKCXrY8OgKjO1QJH2K5Y6zFGKwKjO1QJH2K5Y6zF'
WHERE "name" = 'Dr. Sarah Wijaya';

-- Handle any other doctors with default values
UPDATE "Doctor" SET 
  "fullname" = COALESCE("fullname", "name"),
  "category" = COALESCE("category", "specialty"),
  "university" = COALESCE("university", 'Universitas Default'),
  "strNumber" = COALESCE("strNumber", 'STR-' || substr(md5(random()::text), 1, 4)),
  "gender" = COALESCE("gender", 'male'),
  "email" = COALESCE("email", lower(replace("name", ' ', '.')) || '@example.com'),
  "password" = COALESCE("password", '$2b$12$XVDd3Y6yFGK9nNJKCXrY8OgKjO1QJH2K5Y6zFGKwKjO1QJH2K5Y6zF')
WHERE "fullname" IS NULL;

-- Step 3: Make columns NOT NULL after data migration
ALTER TABLE "Doctor" ALTER COLUMN "fullname" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "university" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "strNumber" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "gender" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "password" SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "Doctor" DROP COLUMN "name";
ALTER TABLE "Doctor" DROP COLUMN "specialty";

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_strNumber_key" ON "Doctor"("strNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
