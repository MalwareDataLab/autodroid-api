import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Service import
import { RemoveAllDanglingFilesService } from "@modules/file/services/removeAllDanglingFiles.service";

interface IRequest {
  user: User;
  language: string;
}

@injectable()
class AdminFileRemoveAllDanglingService {
  private removeAllDanglingFilesService: RemoveAllDanglingFilesService;

  constructor(
    @inject("FileRepository")
    private fileRepository: IFileRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {
    this.removeAllDanglingFilesService = new RemoveAllDanglingFilesService(
      this.fileRepository,
      this.storageProvider,
    );
  }

  @RequireAdminPermission()
  public async execute(_: IRequest): Promise<number> {
    return this.removeAllDanglingFilesService.execute();
  }
}

export { AdminFileRemoveAllDanglingService };
