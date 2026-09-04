import { inject, injectable } from "tsyringe";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Decorator import
import { RequireAdminPermission } from "@modules/admin/decorators/requireAdminPermission.decorator";

// Repository import
import { IWorkerRepository } from "@shared/container/repositories";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginatedWorker } from "@modules/worker/entities/worker.entity";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";

// Schema import
import { WorkerIndexSchema } from "@modules/worker/schemas/worker.schema";

interface IRequest {
  filter: WorkerIndexSchema;

  pagination?: IPaginationDTO;
  sorting?: ISortingDTO<typeof WorkerSortingOptions>;

  user: User;
  language: string;
}

@injectable()
class AdminWorkerIndexService {
  constructor(
    @inject("WorkerRepository")
    private workerRepository: IWorkerRepository,
  ) {}

  @RequireAdminPermission()
  public async execute({
    filter,

    pagination,
    sorting,
  }: IRequest): Promise<PaginatedWorker> {
    const totalCount = await this.workerRepository.getCount(filter);

    const workers = await this.workerRepository.findMany(
      filter,
      pagination,
      sorting,
    );

    return PaginatedWorker.make({
      items: workers,
      totalCount,
      paginationRequest: pagination,
    });
  }
}

export { AdminWorkerIndexService };
