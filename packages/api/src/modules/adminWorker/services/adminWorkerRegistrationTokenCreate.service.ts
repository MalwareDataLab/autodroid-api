import { inject, injectable } from "tsyringe";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// Schema import
import { WorkerRegistrationTokenCreateSchema } from "@modules/worker/schemas/workerRegistrationToken.schema";

// Service import
import { WorkerRegistrationTokenGenerateService } from "@modules/worker/services/workerRegistrationTokenGenerate.service";

interface IRequest {
  data: WorkerRegistrationTokenCreateSchema;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerRegistrationTokenCreateService {
  private workerRegistrationTokenGenerateService: WorkerRegistrationTokenGenerateService;

  constructor(
    @inject("WorkerRegistrationTokenRepository")
    private workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository,
  ) {
    this.workerRegistrationTokenGenerateService =
      new WorkerRegistrationTokenGenerateService(
        this.workerRegistrationTokenRepository,
      );
  }

  @RequireAdminPermission()
  public async execute({
    user,
    data,
  }: IRequest): Promise<WorkerRegistrationToken> {
    const token = await this.workerRegistrationTokenGenerateService.execute();

    const workerRegistrationToken =
      await this.workerRegistrationTokenRepository.createOne({
        expires_at: data.expires_at || null,
        is_unlimited_usage: data.is_unlimited_usage,

        user_id: user.id,

        token,
        activated_at: null,
      });

    return workerRegistrationToken;
  }
}

export { AdminWorkerRegistrationTokenCreateService };
