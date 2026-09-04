// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateWorkerDTO,
  IFindWorkerDTO,
  IUpdateWorkerDTO,
} from "../types/IWorker.dto";

// Entity import
import { Worker } from "../entities/worker.entity";

export interface IWorkerRepository {
  createOne(data: ICreateWorkerDTO): Promise<Worker>;

  findOne(filter: IFindWorkerDTO): Promise<Worker | null>;
  findMany(
    filter: IFindWorkerDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof WorkerSortingOptions>,
  ): Promise<Worker[]>;

  getCount(filter: IFindWorkerDTO): Promise<number>;

  updateOne(
    filter: IFindWorkerDTO,
    data: IUpdateWorkerDTO,
  ): Promise<Worker | null>;

  deleteOne(filter: IFindWorkerDTO): Promise<Worker | null>;
}
