-- DropForeignKey
ALTER TABLE "processes" DROP CONSTRAINT "processes_metrics_file_id_fkey";

-- DropForeignKey
ALTER TABLE "processes" DROP CONSTRAINT "processes_result_file_id_fkey";

-- DropForeignKey
ALTER TABLE "processes" DROP CONSTRAINT "processes_worker_id_fkey";

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_result_file_id_fkey" FOREIGN KEY ("result_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_metrics_file_id_fkey" FOREIGN KEY ("metrics_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
