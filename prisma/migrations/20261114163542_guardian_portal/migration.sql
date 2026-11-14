-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'guardian';

-- CreateTable
CREATE TABLE "guardian_links" (
    "id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "relation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardian_links_student_id_idx" ON "guardian_links"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_links_guardian_id_student_id_key" ON "guardian_links"("guardian_id", "student_id");

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
