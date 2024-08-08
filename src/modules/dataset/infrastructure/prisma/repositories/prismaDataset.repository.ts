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
  IFindManyPublicOrUserPrivateDTO,
  IUpdateDatasetDTO,
} from "@modules/dataset/types/IDataset.dto";

@injectable()
class PrismaDatasetRepository implements IDatasetRepository {
  private readonly relations = {
    user: true,
    file: true,
  };

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

    return parse(Dataset, datasets);
  }

  public async findManyPublicOrUserPrivate(
    { user_id }: IFindManyPublicOrUserPrivateDTO,
    pagination?: IPaginationDTO,
    sorting?: ISortingDTO<typeof DatasetSortingOptions>,
  ): Promise<Dataset[]> {
    const datasets = await this.databaseProvider.client.dataset.findMany({
      where: {
        OR: [
          {
            visibility: DATASET_VISIBILITY.PUBLIC,
          },
          {
            visibility: DATASET_VISIBILITY.PRIVATE,
            user_id,
          },
        ],
      },

      include: this.relations,

      orderBy: makeSortingArr({
        options: DatasetSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    return parse(Dataset, datasets);
  }

  public async getCount(filter: IFindDatasetDTO): Promise<number> {
    return this.databaseProvider.client.dataset.count({
      where: this.getWhereClause(filter, false),
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
