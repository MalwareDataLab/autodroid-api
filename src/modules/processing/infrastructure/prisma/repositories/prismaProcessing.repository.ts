import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessingSortingOptions } from "@modules/processing/constants/processingSortingOptions.constant";

// Provider import
import {
  DatabaseHelperTypes,
  IDatabaseProvider,
} from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";
import { makePaginationObj } from "@modules/pagination/utils/makePaginationObj";
import { makeSortingArr } from "@modules/sorting/utils/makeSortingArr";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Interface import
import { IProcessingRepository } from "@modules/processing/repositories/IProcessing.repository";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateProcessingDTO,
  IFindProcessingDTO,
  IFindProcessingPublicOrUserPrivateDTO,
  IUpdateProcessingDTO,
} from "@modules/processing/types/IProcessing.dto";

// Enum import
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

@injectable()
class PrismaProcessingRepository implements IProcessingRepository {
  private readonly relations = {
    user: true,
    dataset: {
      include: {
        file: true,
        user: true,
      },
    },
    processor: true,
    result_file: true,
    metrics_file: true,
    worker: true,
  } satisfies DatabaseHelperTypes.ProcessingInclude;

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    {
      id,
      status,
      visibility,

      user_id,
      processor_id,
      dataset_id,
      worker_id,
      result_file_id,
      metrics_file_id,

      started,
      finished,

      keep_until_start_date,
      keep_until_end_date,

      created_at_start_date,
      created_at_end_date,
    }: IFindProcessingDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.ProcessingWhereInput {
    const conditions: DatabaseHelperTypes.ProcessingWhereInput[] = [];

    if (started !== undefined)
      conditions.push({
        started_at: started ? { not: null } : null,
      });

    if (finished !== undefined)
      conditions.push({
        finished_at: finished ? { not: null } : null,
      });

    if (keep_until_start_date !== undefined)
      conditions.push({
        keep_until: {
          not: null,
          gte: keep_until_start_date,
        },
      });

    if (keep_until_end_date !== undefined)
      conditions.push({
        keep_until: {
          not: null,
          lte: keep_until_end_date,
        },
      });

    if (created_at_start_date !== undefined)
      conditions.push({
        created_at: {
          gte: created_at_start_date,
        },
      });

    if (created_at_end_date !== undefined)
      conditions.push({
        created_at: {
          lte: created_at_end_date,
        },
      });

    return {
      id,
      status,
      visibility,

      user_id,
      processor_id,
      dataset_id,
      worker_id,
      result_file_id,
      metrics_file_id,

      AND: conditions,
    };
  }

  private getWhereClausePublicOrUserPrivate({
    user_id,
    ...filter
  }: IFindProcessingPublicOrUserPrivateDTO): DatabaseHelperTypes.ProcessingWhereInput {
    return {
      ...this.getWhereClause(filter),
      AND: {
        OR: [
          { visibility: PROCESSING_VISIBILITY.PUBLIC },
          {
            visibility: PROCESSING_VISIBILITY.PRIVATE,
            user_id,
          },
        ],
      },
    };
  }

  public async createOne(data: ICreateProcessingDTO): Promise<Processing> {
    const processing = await this.databaseProvider.client.processing.create({
      data,
      include: this.relations,
    });

    return parse(Processing, processing);
  }

  public async findOne(filter: IFindProcessingDTO): Promise<Processing | null> {
    return this.findMany(filter, { skip: 0 }).then(result => result[0] || null);
  }

  public async findMany(
    filter: IFindProcessingDTO,
    pagination: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessingSortingOptions>,
  ): Promise<Processing[]> {
    const processes = await this.databaseProvider.client.processing.findMany({
      where: this.getWhereClause(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: ProcessingSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    const result = await File.processAnyNested({
      cls: Processing,
      data: parse(Processing, processes),
    });

    return result;
  }

  public async findManyPublicOrUserPrivate(
    filter: IFindProcessingPublicOrUserPrivateDTO,
    pagination: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessingSortingOptions>,
  ): Promise<Processing[]> {
    const processes = await this.databaseProvider.client.processing.findMany({
      where: this.getWhereClausePublicOrUserPrivate(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: ProcessingSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    const result = await File.processAnyNested({
      cls: Processing,
      data: parse(Processing, processes),
    });

    return result;
  }

  public async getCount(filter: IFindProcessingDTO): Promise<number> {
    return this.databaseProvider.client.processing.count({
      where: this.getWhereClause(filter, false),
    });
  }

  public async getCountPublicOrUserPrivate(
    filter: IFindProcessingPublicOrUserPrivateDTO,
  ): Promise<number> {
    return this.databaseProvider.client.processing.count({
      where: this.getWhereClausePublicOrUserPrivate(filter),
    });
  }

  public async updateOne(
    filter: IFindProcessingDTO,
    data: IUpdateProcessingDTO,
  ): Promise<Processing | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const processing = await this.databaseProvider.client.processing.update({
      where: { id: record.id },
      data,
      include: this.relations,
    });

    return parse(Processing, processing);
  }

  public async deleteOne(
    filter: IFindProcessingDTO,
  ): Promise<Processing | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const processing = await this.databaseProvider.client.processing.delete({
      where: { id: record.id },
      include: this.relations,
    });

    return parse(Processing, processing);
  }
}

export { PrismaProcessingRepository };
