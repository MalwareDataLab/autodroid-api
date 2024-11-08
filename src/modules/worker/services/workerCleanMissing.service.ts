import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Helper import
import { DateHelper } from "@shared/utils/dateHelpers";

// Repository import
import { IWorkerRepository } from "../repositories/IWorker.repository";

@injectable()
class WorkerCleanMissingService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}
  public async execute(): Promise<number> {
    const missingWorkers = await this.workerRepository.findMany({
      last_seen_at_end_date: DateHelper.now().subtract(7, "days").toDate(),
    });

    let count = 0;
    await Promise.all(
      missingWorkers.map(async worker => {
        try {
          await this.workerRepository.deleteOne({
            id: worker.id,
          });

          count += 1;
        } catch (error) {
          const err = AppError.make({
            key: "@worker_clean_missing/ERROR",
            message: `Fail to remove missing worker ${worker.id}. ${error}`,
            debug: {
              missingWorkers,
              error,
            },
          });

          console.log(err);
        }
      }),
    );

    return count;
  }
}

export { WorkerCleanMissingService };
