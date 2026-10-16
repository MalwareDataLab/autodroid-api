import { inject, injectable } from "tsyringe";

// Provider import
import { IJobProvider } from "@shared/container/providers/JobProvider/models/IJob.provider";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Schema import
import { AdminProcessingFailDanglingSchema } from "../schemas/adminProcessing.schema";

// Repository import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// Service import
import { ProcessingFailDanglingService } from "@modules/processing/services/processingFailDangling.service";

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

    @inject("JobProvider")
    private jobProvider: IJobProvider,
  ) {
    this.processingFailDanglingService = new ProcessingFailDanglingService(
      this.processingRepository,
      this.jobProvider,
    );
  }

  @RequireAdminPermission()
  public async execute({ params }: IRequest): Promise<number> {
    return this.processingFailDanglingService.execute(params);
  }
}

export { AdminProcessingFailDanglingService };
