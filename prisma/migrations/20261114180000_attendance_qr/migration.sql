-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "scanned_at" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "qr_issued_at" TIMESTAMP(3),
ADD COLUMN     "qr_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_qr_token_key" ON "students"("qr_token");

