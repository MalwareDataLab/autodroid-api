// DTO import
import {
  ICreateFileDTO,
  IFindFileDTO,
  IUpdateFileDTO,
} from "../types/IFile.dto";

// Entity import
import { File } from "@modules/file/entities/file.entity";

export interface IFileRepository {
  createOne(data: ICreateFileDTO): Promise<File>;

  findOne(filter: IFindFileDTO): Promise<File | null>;

  findMany(filter: IFindFileDTO): Promise<File[]>;

  updateOne(filter: IFindFileDTO, data: IUpdateFileDTO): Promise<File | null>;

  deleteOne(filter: IFindFileDTO): Promise<File | null>;
}
