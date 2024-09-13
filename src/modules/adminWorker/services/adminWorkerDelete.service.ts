import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IWorkerRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Worker } from "@modules/worker/entities/worker.entity";

interface IRequest {
  worker_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerDeleteService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    worker_id,

    language,
  }: IRequest): Promise<Worker> {
    const t = await i18n(language);

    const worker = await this.workerRepository.deleteOne({
      id: worker_id,
    });

    if (!worker)
      throw new AppError({
        key: "@admin_worker_delete_service/WORKER_NOT_FOUND",
        message: t(
          "@admin_worker_delete_service/WORKER_NOT_FOUND",
          "Worker not found.",
        ),
      });

    return worker;
  }
}

export { AdminWorkerDeleteService };
