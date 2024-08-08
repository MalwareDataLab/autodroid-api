import { inject, injectable } from "tsyringe";

// Provider import
import {
  DatabaseHelperTypes,
  IDatabaseProvider,
} from "@shared/container/providers/DatabaseProvider/models/IDatabase.provider";

// Interface import
import { IFileRepository } from "@modules/file/repositories/IFile.repository";

// DTO import

import {
  ICreateFileDTO,
  IFindFileDTO,
  IUpdateFileDTO,
} from "@modules/file/types/IFile.dto";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Util import
import { parse } from "@shared/utils/instanceParser";

@injectable()
class PrismaFileRepository implements IFileRepository {
  constructor(
    @inject("DatabaseProvider")
    private databaseProvider: IDatabaseProvider,
  ) {}

  private getWhereClause(
    { id, provider_path, public_url }: IFindFileDTO,
    relations_enabled = true,
  ): DatabaseHelperTypes.FileWhereInput {
    return {
      id,
      provider_path,
      public_url,
    };
  }

  public async createOne(data: ICreateFileDTO): Promise<File> {
    const file = await this.databaseProvider.client.file.create({
      data: {
        ...data,
        payload: data.payload || {},
      },
    });

    return parse(File, file);
  }

  public async findOne(filter: IFindFileDTO): Promise<File | null> {
    const file = await this.databaseProvider.client.file.findFirst({
      where: this.getWhereClause(filter),
    });

    return parse(File, file);
  }

  public async updateOne(
    filter: IFindFileDTO,
    data: IUpdateFileDTO,
  ): Promise<File | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    const file = await this.databaseProvider.client.file.update({
      where: {
        id: record.id,
      },
      data: {
        ...data,
        payload: data.payload || {},
      },
    });

    return parse(File, file);
  }

  public async deleteOne(filter: IFindFileDTO): Promise<File | null> {
    const record = await this.findOne(filter);
    if (!record) return null;

    await this.databaseProvider.client.file.delete({
      where: { id: record.id },
    });

    return record;
  }
}

export { PrismaFileRepository };
