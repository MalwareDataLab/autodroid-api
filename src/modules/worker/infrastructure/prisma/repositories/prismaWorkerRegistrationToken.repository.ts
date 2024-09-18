import { inject, injectable } from "tsyringe";

// Constant import
import { WorkerRegistrationTokenSortingOptions } from "@modules/worker/constants/workerRegistrationTokenSortingOptions.constant";

// Entity import
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

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
  ICreateWorkerRegistrationTokenDTO,
  IFindWorkerRegistrationTokenDTO,
  IUpdateWorkerRegistrationTokenDTO,
} from "@modules/worker/types/IWorkerRegistrationToken.dto";

// Interface import
import { IWorkerRegistrationTokenRepository } from "@modules/worker/repositories/IWorkerRegistrationToken.repository";

@injectable()
class PrismaWorkerRegistrationTokenRepository
  implements IWorkerRegistrationTokenRepository
{
  private readonly relations =
    {} satisfies DatabaseHelperTypes.WorkerRegistrationTokenInclude;

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    {
      id,
      token,
      is_unlimited_usage,
      user_id,

      activated,
      activatable,
      expired,
      archived,
    }: IFindWorkerRegistrationTokenDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.WorkerRegistrationTokenWhereInput {
    return {
      id,
      token,
      is_unlimited_usage,
      user_id,

      ...(activated !== undefined && {
        activated_at: activated ? { not: null } : null,
      }),

      ...(archived !== undefined && {
        archived_at: archived ? { not: null } : null,
      }),

      ...(expired !== undefined && {
        expires_at: expired ? { lte: new Date() } : { gt: new Date() },
      }),

      ...(activatable !== undefined && {
        AND: activatable
          ? {
              archived_at: null,
              expires_at: { gt: new Date() },
              OR: [{ activated_at: null }, { is_unlimited_usage: true }],
            }
          : {
              OR: [
                { archived_at: { not: null } },
                { expires_at: { lte: new Date() } },
                {
                  AND: [
                    { activated_at: { not: null } },
                    { is_unlimited_usage: false },
                  ],
                },
              ],
            },
      }),
    };
  }

  public async createOne(
    data: ICreateWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken> {
    const workerRegistrationToken =
      await this.databaseProvider.client.workerRegistrationToken.create({
        data,
        include: this.relations,
      });

    return parse(WorkerRegistrationToken, workerRegistrationToken);
  }

  public async findOne(
    filter: IFindWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null> {
    return this.findMany(filter, { skip: 0, take: 1 }).then(
      result => result[0] || null,
    );
  }

  public async findMany(
    filter: IFindWorkerRegistrationTokenDTO,
    pagination: IPaginationDTO,
    sorting?: ISortingDTO<typeof WorkerRegistrationTokenSortingOptions>,
  ): Promise<WorkerRegistrationToken[]> {
    const workerRegistrationToken =
      await this.databaseProvider.client.workerRegistrationToken.findMany({
        where: this.getWhereClause(filter),

        include: this.relations,

        orderBy: makeSortingArr({
          options: WorkerRegistrationTokenSortingOptions,
          sorting,
        }),
        ...makePaginationObj(pagination),
      });

    return parse(WorkerRegistrationToken, workerRegistrationToken);
  }

  public async getCount(
    filter: IFindWorkerRegistrationTokenDTO,
  ): Promise<number> {
    return this.databaseProvider.client.workerRegistrationToken.count({
      where: this.getWhereClause(filter),
    });
  }

  public async updateOne(
    filter: IFindWorkerRegistrationTokenDTO,
    data: IUpdateWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const workerRegistrationToken =
      await this.databaseProvider.client.workerRegistrationToken.update({
        where: { id: record.id },
        data,
        include: this.relations,
      });

    return parse(WorkerRegistrationToken, workerRegistrationToken);
  }

  public async deleteOne(
    filter: IFindWorkerRegistrationTokenDTO,
  ): Promise<WorkerRegistrationToken | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const workerRegistrationToken =
      await this.databaseProvider.client.workerRegistrationToken.update({
        where: { id: record.id },
        data: { archived_at: new Date() },
        include: this.relations,
      });

    return parse(WorkerRegistrationToken, workerRegistrationToken);
  }
}

export { PrismaWorkerRegistrationTokenRepository };
