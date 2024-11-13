import { inject, injectable } from "tsyringe";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { logger } from "@shared/utils/logger";
import { DateUtils } from "@shared/utils/dateUtils";

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
      last_seen_at_end_date: DateUtils.now().subtract(7, "days").toDate(),
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

          logger.error(err);
        }
      }),
    );

    return count;
  }
}

export { WorkerCleanMissingService };
