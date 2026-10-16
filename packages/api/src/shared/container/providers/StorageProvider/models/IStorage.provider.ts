// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";

// DTO import
import { IRefreshFileDTO } from "../types/IRefreshFile.dto";
import { IRemoveFileByNameDTO } from "../types/IRemoveFile.dto";
import { IGenerateUploadSignedUrlRequestParamsDTO } from "../types/IUploadFile.dto";

// Entity import
import { File } from "@modules/file/entities/file.entity";

export interface IStorageProvider {
  readonly provider_code: STORAGE_PROVIDER;
  readonly initialization: Promise<void>;

  generateUploadSignedUrl(
    params: IGenerateUploadSignedUrlRequestParamsDTO,
  ): Promise<File>;

  refreshFile(params: IRefreshFileDTO): Promise<File>;

  removeFileByPath(params: IRemoveFileByNameDTO): Promise<string>;
}
