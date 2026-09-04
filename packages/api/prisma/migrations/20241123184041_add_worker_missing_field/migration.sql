-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "missing" BOOLEAN NOT NULL DEFAULT false;
UPDATE "workers" SET "archived_at" = NULL;
