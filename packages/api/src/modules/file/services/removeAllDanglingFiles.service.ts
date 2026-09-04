import { inject, injectable } from "tsyringe";

// i18n import
import { DEFAULT_LANGUAGE } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Util import
import { logger } from "@shared/utils/logger";
import { DateUtils } from "@shared/utils/dateUtils";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Enum import
import { FILE_PROVIDER_STATUS } from "../types/fileProviderStatus.enum";

@injectable()
class RemoveAllDanglingFilesService {
  constructor(
    @inject("FileRepository")
    private fileRepository: IFileRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {}

  public async execute(): Promise<number> {
    const expiredUploadFiles = await this.fileRepository.findMany({
      provider_status: FILE_PROVIDER_STATUS.PENDING,
      upload_url_expires_end_date: DateUtils.now()
        .subtract(3, "hours")
        .toDate(),
    });

    await Promise.all(
      expiredUploadFiles.map(async file => {
        try {
          await this.storageProvider.refreshFile({
            file,
          });
        } catch {}
      }),
    );

    const notFoundFiles = await this.fileRepository.findMany({
      provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
    });

    let count = 0;

    await Promise.all(
      notFoundFiles.map(async file => {
        try {
          await this.storageProvider.removeFileByPath({
            path: file.provider_path,
            language: DEFAULT_LANGUAGE,
          });
          count += 1;
        } catch (error) {
          const err = AppError.make({
            key: "@remove_all_dangling_files_service/ERROR",
            message: `Fail to remove dangling file ${file.id}. ${error}`,
            debug: {
              expiredUploadFiles,
              notFoundFiles,
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

export { RemoveAllDanglingFilesService };
