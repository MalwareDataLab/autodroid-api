// Entity import
import { File } from "@modules/file/entities/file.entity";

// DTO import
import {
  ICreateFileDTO,
  IFindFileDTO,
  IUpdateFileDTO,
} from "../types/IFile.dto";

export interface IFileRepository {
  create(data: ICreateFileDTO): Promise<File>;

  findOne(filter: IFindFileDTO): Promise<File | null>;

  updateOne(filter: IFindFileDTO, data: IUpdateFileDTO): Promise<File | null>;

  deleteOne(filter: IFindFileDTO): Promise<File | null>;
}
