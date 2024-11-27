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
import { ProcessingFailDanglingService } from "@modules/processing/services/processingFailDangling.service";

// Schema import
import { AdminProcessingFailDanglingSchema } from "../schemas/adminProcessing.schema";

interface IRequest {
  user: User;
  params: AdminProcessingFailDanglingSchema;
  language: string;
}

@injectable()
class AdminProcessingFailDanglingService {
  private processingFailDanglingService: ProcessingFailDanglingService;

  constructor(
    @inject("ProcessingRepository")
    private processingRepository: IProcessingRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {
    this.processingFailDanglingService = new ProcessingFailDanglingService(
      this.processingRepository,
    );
  }

  @RequireAdminPermission()
  public async execute({ params }: IRequest): Promise<number> {
    return this.processingFailDanglingService.execute(params);
  }
}

export { AdminProcessingFailDanglingService };
