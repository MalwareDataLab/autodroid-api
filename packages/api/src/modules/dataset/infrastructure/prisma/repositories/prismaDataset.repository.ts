import { inject, injectable } from "tsyringe";

// Constant import
import { DatasetSortingOptions } from "@modules/dataset/constants/datasetSortingOptions.constant";

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
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Interface import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateDatasetDTO,
  IFindDatasetDTO,
  IFindDatasetPublicOrUserPrivateDTO,
  IUpdateDatasetDTO,
} from "@modules/dataset/types/IDataset.dto";

@injectable()
class PrismaDatasetRepository implements IDatasetRepository {
  private readonly relations = {
    user: true,
    file: true,
  } satisfies DatabaseHelperTypes.DatasetInclude;

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    { id, user_id, file_id, visibility }: IFindDatasetDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.DatasetWhereInput {
    return {
      id,
      user_id,
      file_id,
      visibility,
    };
  }

  private getWhereClausePublicOrUserPrivate({
    user_id,
    ...filter
  }: IFindDatasetPublicOrUserPrivateDTO): DatabaseHelperTypes.DatasetWhereInput {
    return {
      ...this.getWhereClause(filter),
      AND: {
        OR: [
          { visibility: DATASET_VISIBILITY.PUBLIC },
          {
            visibility: DATASET_VISIBILITY.PRIVATE,
            user_id,
          },
        ],
      },
    };
  }

  public async createOne(data: ICreateDatasetDTO): Promise<Dataset> {
    const dataset = await this.databaseProvider.client.dataset.create({
      data,
      include: this.relations,
    });

    return parse(Dataset, dataset);
  }

  public async findOne(filter: IFindDatasetDTO): Promise<Dataset | null> {
    return this.findMany(filter).then(result => result[0] || null);
  }

  public async findMany(
    filter: IFindDatasetDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof DatasetSortingOptions>,
  ): Promise<Dataset[]> {
    const datasets = await this.databaseProvider.client.dataset.findMany({
      where: this.getWhereClause(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: DatasetSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    const result = await File.processAnyNested({
      cls: Dataset,
      data: parse(Dataset, datasets),
    });

    return result;
  }

  public async findManyPublicOrUserPrivate(
    filter: IFindDatasetPublicOrUserPrivateDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof DatasetSortingOptions>,
  ): Promise<Dataset[]> {
    const datasets = await this.databaseProvider.client.dataset.findMany({
      where: this.getWhereClausePublicOrUserPrivate(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: DatasetSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    const result = await File.processAnyNested({
      cls: Dataset,
      data: parse(Dataset, datasets),
    });

    return result;
  }

  public async getCount(filter: IFindDatasetDTO): Promise<number> {
    return this.databaseProvider.client.dataset.count({
      where: this.getWhereClause(filter, false),
    });
  }

  public async getCountPublicOrUserPrivate(
    filter: IFindDatasetPublicOrUserPrivateDTO,
  ): Promise<number> {
    return this.databaseProvider.client.dataset.count({
      where: this.getWhereClausePublicOrUserPrivate(filter),
    });
  }

  public async updateOne(
    filter: IFindDatasetDTO,
    data: IUpdateDatasetDTO,
  ): Promise<Dataset | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const dataset = await this.databaseProvider.client.dataset.update({
      where: { id: record.id },
      data,
      include: this.relations,
    });

    return parse(Dataset, dataset);
  }

  public async deleteOne(filter: IFindDatasetDTO): Promise<Dataset | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const dataset = await this.databaseProvider.client.dataset.delete({
      where: { id: record.id },
      include: this.relations,
    });

    return parse(Dataset, dataset);
  }
}

export { PrismaDatasetRepository };
