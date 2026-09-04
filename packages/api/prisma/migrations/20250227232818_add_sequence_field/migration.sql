/*
  Warnings:

  - A unique constraint covering the columns `[seq]` on the table `datasets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `processes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `processors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `user_auth_provider_conns` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `worker_registration_tokens` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seq]` on the table `workers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "processes" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "processors" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "user_auth_provider_conns" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "worker_registration_tokens" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- AlterTable
ALTER TABLE "workers" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "datasets_seq_key" ON "datasets"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "files_seq_key" ON "files"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "processes_seq_key" ON "processes"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "processors_seq_key" ON "processors"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_provider_conns_seq_key" ON "user_auth_provider_conns"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "users_seq_key" ON "users"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "worker_registration_tokens_seq_key" ON "worker_registration_tokens"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "workers_seq_key" ON "workers"("seq");
