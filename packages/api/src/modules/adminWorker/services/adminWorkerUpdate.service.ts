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

// Schema import
import { isValidCommaSeparatedString } from "@shared/utils/isValidCommaSeparatedString";
import { AdminWorkerUpdateSchema } from "../schemas/adminWorkerUpdate.schema";

interface IRequest {
  worker_id: string;
  data: AdminWorkerUpdateSchema;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerUpdateService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    worker_id,
    data,

    language,
  }: IRequest): Promise<Worker> {
    const t = await i18n(language);

    const worker = await this.workerRepository.findOne({
      id: worker_id,
    });

    if (!worker)
      throw new AppError({
        key: "@admin_worker_update_service/WORKER_NOT_FOUND",
        message: t(
          "@admin_worker_update_service/WORKER_NOT_FOUND",
          "Worker not found.",
        ),
      });

    if (!!data.tags && !isValidCommaSeparatedString(data.tags))
      throw new AppError({
        key: "@admin_worker_update_service/TAGS_NOT_PROVIDED",
        message: t(
          "@admin_worker_update_service/TAGS_NOT_PROVIDED",
          "Tags must be a comma-separated list.",
        ),
      });

    const updatedWorker = await this.workerRepository.updateOne(
      { id: worker.id },
      data,
    );

    if (!updatedWorker)
      throw new AppError({
        key: "@admin_worker_update_service/WORKER_NOT_UPDATED",
        message: t(
          "@admin_worker_update_service/WORKER_NOT_UPDATED",
          "Worker not updated.",
        ),
      });

    return updatedWorker;
  }
}

export { AdminWorkerUpdateService };
