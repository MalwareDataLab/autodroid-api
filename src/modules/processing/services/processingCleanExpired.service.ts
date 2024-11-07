import { inject, injectable } from "tsyringe";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IProcessingRepository } from "../repositories/IProcessing.repository";

@injectable()
class ProcessingCleanExpiredService {
  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {}
  public async execute(): Promise<number> {
    const expiredProcesses = await this.processingRepository.findMany({
      keep_until_start_date: new Date(),
    });

    let count = 0;
    await Promise.all(
      expiredProcesses.map(async processing => {
        try {
          if (processing.result_file?.provider_path)
            await this.storageProvider.removeFileByPath({
              path: processing.result_file.provider_path,
              language: DEFAULT_LANGUAGE,
            });

          if (processing.metrics_file?.provider_path)
            await this.storageProvider.removeFileByPath({
              path: processing.metrics_file.provider_path,
              language: DEFAULT_LANGUAGE,
            });

          await this.processingRepository.deleteOne({
            id: processing.id,
          });

          count += 1;
        } catch (error) {
          const err = AppError.make({
            key: "@processing_clean_expired/ERROR",
            message: `Fail to remove expired processing ${processing.id}. ${error}`,
            debug: {
              expiredProcesses,
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

export { ProcessingCleanExpiredService };
