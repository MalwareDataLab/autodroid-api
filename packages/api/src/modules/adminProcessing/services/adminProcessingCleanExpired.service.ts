import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Service import
import { ProcessingCleanExpiredService } from "@modules/processing/services/processingCleanExpired.service";

interface IRequest {
  user: User;
  language: string;
}

@injectable()
class AdminProcessingCleanExpiredService {
  private processingCleanExpiredService: ProcessingCleanExpiredService;

  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {
    this.processingCleanExpiredService = new ProcessingCleanExpiredService(
      this.processingRepository,
      this.storageProvider,
    );
  }

  @RequireAdminPermission()
  public async execute(_: IRequest): Promise<number> {
    return this.processingCleanExpiredService.execute();
  }
}

export { AdminProcessingCleanExpiredService };
