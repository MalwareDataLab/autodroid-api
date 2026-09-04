import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

interface IRequest {
  worker_registration_token_id: string;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerRegistrationTokenShowService {
  constructor(
    @inject("WorkerRegistrationTokenRepository")
    private workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    worker_registration_token_id,

    language,
  }: IRequest): Promise<WorkerRegistrationToken> {
    const t = await i18n(language);

    const workerRegistrationToken =
      await this.workerRegistrationTokenRepository.findOne({
        id: worker_registration_token_id,
      });

    if (!workerRegistrationToken)
      throw new AppError({
        key: "@admin_worker_registration_token_show_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
        message: t(
          "@admin_worker_registration_token_show_service/WORKER_REGISTRATION_TOKEN_NOT_FOUND",
          "Worker registration token not found.",
        ),
      });

    return workerRegistrationToken;
  }
}

export { AdminWorkerRegistrationTokenShowService };
