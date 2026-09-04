// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateWorkerRegistrationTokenDTO,
  IFindWorkerRegistrationTokenDTO,
  IUpdateWorkerRegistrationTokenDTO,
} from "../types/IWorkerRegistrationToken.dto";

// Entity import
import { WorkerRegistrationToken } from "../entities/workerRegistrationToken.entity";

export interface IWorkerRegistrationTokenRepository {
  createOne(
    data: ICreateWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken>;

  findOne(
    filter: IFindWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null>;
  findMany(
    filter: IFindWorkerRegistrationTokenDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof WorkerRegistrationTokenSortingOptions>,
  ): Promise<WorkerRegistrationToken[]>;

  getCount(filter: IFindWorkerRegistrationTokenDTO): Promise<number>;

  updateOne(
    filter: IFindWorkerRegistrationTokenDTO,
    data: IUpdateWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null>;

  deleteOne(
    filter: IFindWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null>;
}
