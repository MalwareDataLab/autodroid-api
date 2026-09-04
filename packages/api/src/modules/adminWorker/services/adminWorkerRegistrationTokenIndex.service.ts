import { inject, injectable } from "tsyringe";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IWorkerRegistrationTokenRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedWorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Schema import
import { WorkerRegistrationTokenIndexSchema } from "@modules/worker/schemas/workerRegistrationToken.schema";

interface IRequest {
  filter: WorkerRegistrationTokenIndexSchema;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof WorkerRegistrationTokenSortingOptions>;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerRegistrationTokenIndexService {
  constructor(
    @inject("WorkerRegistrationTokenRepository")
    private workerRegistrationTokenRepository: IWorkerRegistrationTokenRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    filter,

    pagination,
    sorting,
  }: IRequest): Promise<PaginatedWorkerRegistrationToken> {
    const totalCount =
      await this.workerRegistrationTokenRepository.getCount(filter);

    const workerRegistrationTokens =
      await this.workerRegistrationTokenRepository.findMany(
        filter,
        pagination,
        sorting,
      );

    return PaginatedWorkerRegistrationToken.make({
      items: workerRegistrationTokens,
      totalCount,
      paginationRequest: pagination,
    });
  }
}

export { AdminWorkerRegistrationTokenIndexService };
