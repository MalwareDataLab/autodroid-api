import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Repository import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

// Service import
import { WorkerCleanMissingService } from "@modules/worker/services/workerCleanMissing.service";

interface IRequest {
  user: User;
  language: string;
}

@injectable()
class AdminWorkerCleanMissingService {
  private workerCleanMissingService: WorkerCleanMissingService;

  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {
    this.workerCleanMissingService = new WorkerCleanMissingService(
      this.workerRepository,
    );
  }

  @RequireAdminPermission()
  public async execute(_: IRequest): Promise<number> {
    return this.workerCleanMissingService.execute();
  }
}

export { AdminWorkerCleanMissingService };
