import { inject, injectable } from "tsyringe";

// Provider import
import { IDatabaseProvider } from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Util import
import { parse } from "@shared/utils/instanceParser";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Interface import
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// DTO import
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

  public async findMany(filter: IFindDatasetDTO): Promise<Dataset[]> {
    const datasets = await this.databaseProvider.client.dataset.findMany({
      where: filter,
      include: this.relations,
    });

    return parse(Dataset, datasets);
  }

  public async findManyPublicOrUserPrivate({
    user_id,
  }: IFindManyPublicOrUserPrivateDTO): Promise<Dataset[]> {
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
    });

    return parse(Dataset, datasets);
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
