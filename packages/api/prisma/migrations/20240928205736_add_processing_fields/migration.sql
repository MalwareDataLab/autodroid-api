-- AlterTable
ALTER TABLE "processes" ADD COLUMN     "attempts" INTEGER,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3);
