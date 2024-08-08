import { inject, injectable } from "tsyringe";

// Constant import
import { ProcessorSortingOptions } from "@modules/processor/constants/processorSortingOptions.constant";

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
import { Processor } from "@modules/processor/entities/processor.entity";

// Interface import
import { IProcessorRepository } from "@modules/processor/repositories/IProcessor.repository";

// DTO import
import { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";
import { ISortingDTO } from "@modules/sorting/types/ISorting.dto";
import {
  ICreateProcessorDTO,
  IFindProcessorDTO,
  IUpdateProcessorDTO,
} from "@modules/processor/types/IProcessor.dto";

@injectable()
class PrismaProcessorRepository implements IProcessorRepository {
  private readonly relations = {
    user: true,
  };

  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    { id, user_id, visibility }: IFindProcessorDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.ProcessorWhereInput {
    return {
      id,
      user_id,
      visibility,
    };
  }

  public async createOne(data: ICreateProcessorDTO): Promise<Processor> {
    const processor = await this.databaseProvider.client.processor.create({
      data,
      include: this.relations,
    });

    return parse(Processor, processor);
  }

  public async findOne(filter: IFindProcessorDTO): Promise<Processor | null> {
    return this.findMany(filter, { skip: 0 }).then(result => result[0] || null);
  }

  public async findMany(
    filter: IFindProcessorDTO,
    pagination: IPaginationDTO,
    sorting?: ISortingDTO<typeof ProcessorSortingOptions>,
  ): Promise<Processor[]> {
    const processors = await this.databaseProvider.client.processor.findMany({
      where: this.getWhereClause(filter),

      include: this.relations,

      orderBy: makeSortingArr({
        options: ProcessorSortingOptions,
        sorting,
      }),
      ...makePaginationObj(pagination),
    });

    return parse(Processor, processors);
  }

  public async getCount(filter: IFindProcessorDTO): Promise<number> {
    return this.databaseProvider.client.processor.count({
      where: this.getWhereClause(filter, false),
    });
  }

  public async updateOne(
    filter: IFindProcessorDTO,
    data: IUpdateProcessorDTO,
  ): Promise<Processor | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const processor = await this.databaseProvider.client.processor.update({
      where: { id: record.id },
      data,
      include: this.relations,
    });

    return parse(Processor, processor);
  }

  public async deleteOne(filter: IFindProcessorDTO): Promise<Processor | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const processor = await this.databaseProvider.client.processor.delete({
      where: { id: record.id },
      include: this.relations,
    });

    return parse(Processor, processor);
  }
}

export { PrismaProcessorRepository };
