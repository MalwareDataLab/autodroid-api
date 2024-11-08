import { inject, injectable } from "tsyringe";

// Constant import
import { WorkerSortingOptions } from "@modules/worker/constants/workerSortingOptions.constant";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";

// Provider import
import {
  DatabaseHelperTypes,
  IDatabaseProvider,
} from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";
import { makePaginationObj } from "@modules/pagination/utils/makePaginationObj";
import { makeSortingArr } from "@modules/sorting/utils/makeSortingArr";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateWorkerDTO,
  IFindWorkerDTO,
  IUpdateWorkerDTO,
} from "@modules/worker/types/IWorker.dto";

// Interface import
import { IWorkerRepository } from "@modules/worker/repositories/IWorker.repository";

@injectable()
class PrismaWorkerRepository implements IWorkerRepository {
  private readonly relations: DatabaseHelperTypes.WorkerInclude = {
    registration_token: true,
    user: true,
  } satisfies DatabaseHelperTypes.WorkerInclude;

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    {
      id,
      refresh_token,
      user_id,
      registration_token,
      registration_token_id,
      internal_id,
      signature,

      last_seen_at_start_date,
      last_seen_at_end_date,

      archived,
    }: IFindWorkerDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.WorkerWhereInput {
    const conditions: DatabaseHelperTypes.WorkerWhereInput[] = [];

    if (last_seen_at_start_date !== undefined)
      conditions.push({
        last_seen_at: {
          not: null,
          gte: last_seen_at_start_date,
        },
      });

    if (last_seen_at_end_date !== undefined)
      conditions.push({
        last_seen_at: {
          not: null,
          lte: last_seen_at_end_date,
        },
      });

    return {
      id,
      refresh_token,
      user_id,
      registration_token_id,
      internal_id,
      signature,

      ...(archived !== undefined && {
        archived_at: archived ? { not: null } : null,
      }),

      registration_token: relations_enabled
        ? { token: registration_token }
        : undefined,

      AND: conditions,
    };
  }

  public async createOne(data: ICreateWorkerDTO): Promise<Worker> {
    const worker = await this.databaseProvider.client.worker.create({
      data,
      include: this.relations,
    });

    return parse(Worker, worker);
  }

  public async findOne(filter: IFindWorkerDTO): Promise<Worker | null> {
    return this.findMany(filter, { skip: 0, take: 1 }).then(
      result => result[0] || null,
    );
  }

  public async findMany(
    filter: IFindWorkerDTO,
    pagination: IPaginationDTO,
    sorting?: ISortingDTO<typeof WorkerSortingOptions>,
  ): Promise<Worker[]> {
    const worker = await this.databaseProvider.client.worker.findMany({
      where: this.getWhereClause(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: WorkerSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    return parse(Worker, worker);
  }

  public async getCount(filter: IFindWorkerDTO): Promise<number> {
    return this.databaseProvider.client.worker.count({
      where: this.getWhereClause(filter),
    });
  }

  public async updateOne(
    filter: IFindWorkerDTO,
    data: IUpdateWorkerDTO,
  ): Promise<Worker | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const worker = await this.databaseProvider.client.worker.update({
      where: { id: record.id },
      data,
      include: this.relations,
    });

    return parse(Worker, worker);
  }

  public async deleteOne(filter: IFindWorkerDTO): Promise<Worker | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const worker = await this.databaseProvider.client.worker.update({
      where: { id: record.id },
      data: { archived_at: new Date() },
      include: this.relations,
    });

    return parse(Worker, worker);
  }
}

export { PrismaWorkerRepository };
