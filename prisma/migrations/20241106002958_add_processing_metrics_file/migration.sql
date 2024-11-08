-- AlterTable
ALTER TABLE "processes" ADD COLUMN     "metrics_file_id" TEXT;

-- AddForeignKey
ALTER TABLE "processes" ADD CONSTRAINT "processes_metrics_file_id_fkey" FOREIGN KEY ("metrics_file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
