-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "description" TEXT,
ADD COLUMN     "last_seen_at" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT;
