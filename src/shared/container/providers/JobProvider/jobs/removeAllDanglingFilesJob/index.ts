import { injectable, container } from "tsyringe";
import { DoneCallback, Job } from "bull";

// Error import
import { AppError } from "@shared/errors/AppError";

// Interface import
import { IJob } from "@shared/container/providers/JobProvider/models/IJob";

// DTO import
import { RemoveAllDanglingFilesService } from "@modules/file/services/removeAllDanglingFiles.service";
import {
  IJobOptionsDTO,
  IQueueOptionsDTO,
} from "../../types/IAddJobOptions.dto";

type IRemoveAllDanglingFilesJob = never;

@injectable()
class RemoveAllDanglingFilesJob implements IJob {
  public readonly name = "RemoveAllDanglingFilesJob";
  public readonly concurrency = 1;

  public readonly jobOptions: IJobOptionsDTO = {};
  public readonly queueOptions: IQueueOptionsDTO = {};

  constructor() {}

  public async handle(
    job: Job<IRemoveAllDanglingFilesJob>,
    done: DoneCallback,
  ): Promise<void> {
    try {
      const removeAllDanglingFilesService = container.resolve(
        RemoveAllDanglingFilesService,
      );

      const count = await removeAllDanglingFilesService.execute();

      done(null, `Removed ${count} dangling files.`);
    } catch (error: any) {
      done(
        new AppError({
          key: "@remove_all_dangling_files_job/ERROR",
          message: `Fail to remove all dandling files. ${error.message}`,
        }),
      );
    }
  }
}

export type { IRemoveAllDanglingFilesJob };
export { RemoveAllDanglingFilesJob };
