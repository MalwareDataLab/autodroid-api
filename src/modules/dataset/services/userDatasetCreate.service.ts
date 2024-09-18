import { inject, injectable } from "tsyringe";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// DTO import
import { IParsedUserAgentInfoDTO } from "@shared/container/providers/UserAgentInfoProvider/types/IParsedUserAgentInfo.dto";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Repository import
import { IProcessorRepository } from "@shared/container/repositories";
import { IDatasetRepository } from "@modules/dataset/repositories/IDataset.repository";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Schema import
import { UserDatasetCreateSchema } from "../schemas/userDataset.schema";

interface IRequest {
  data: UserDatasetCreateSchema;

  user: User;
  agent_info?: IParsedUserAgentInfoDTO;
  language: string;
}

@injectable()
class UserDatasetCreateService {
  constructor(
    @inject("DatasetRepository")
    private datasetRepository: IDatasetRepository,

    @inject("ProcessorRepository")
    private processorRepository: IProcessorRepository,

    @inject("StorageProvider")
    private storageProvider: IStorageProvider,
  ) {}

  public async execute({
    data,
    user,
    agent_info,
    language,
  }: IRequest): Promise<Dataset> {
    const t = await i18n(language);

    if (!!data.description && typeof data.description !== "string")
      throw new AppError({
        key: "@user_dataset_create_service/INVALID_DESCRIPTION",
        message: t(
          "@user_dataset_create_service/INVALID_DESCRIPTION",
          "Invalid description.",
        ),
      });

    if (
      !!data.tags &&
      !data.tags.split(",").every((tag: string) => tag.trim().length > 0)
    )
      throw new AppError({
        key: "@user_dataset_create_service/TAGS_NOT_PROVIDED",
        message: t(
          "@user_dataset_create_service/TAGS_NOT_PROVIDED",
          "Tags must be a comma-separated list.",
        ),
      });

    const acceptedMimeTypes =
      await this.processorRepository.getAllowedMimeTypes();

    if (!acceptedMimeTypes.includes(data.mime_type.toString()))
      throw new AppError({
        key: "@user_dataset_create_service/INVALID_MIME_TYPE",
        message: t(
          "@user_dataset_create_service/INVALID_MIME_TYPE",
          "Invalid mime type.",
        ),
      });

    const file = await this.storageProvider.generateUploadSignedUrl({
      filename: data.filename,
      mimeType: data.mime_type,
      fileType: FILE_TYPE.DATASET,
      size: data.size,
      md5Hash: data.md5_hash,

      cloudDirDestination: "datasets",
      allowPublicAccess: true,

      user,
      agentInfo: agent_info,
      language,
    });

    const dataset = await this.datasetRepository.createOne({
      user_id: user.id,
      file_id: file.id,

      description: data.description ? String(data.description).trim() : null,
      tags: data.tags
        ? String(data.tags)
            .split(",")
            .map(tag => tag.trim())
            .join(",")
        : null,

      visibility: DATASET_VISIBILITY.PRIVATE,
    });

    return dataset;
  }
}

export { UserDatasetCreateService };
