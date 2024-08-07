import { inject, injectable } from "tsyringe";
import { Bucket, Storage } from "@google-cloud/storage";
import {
  addDays,
  addMilliseconds,
  isAfter,
  isBefore,
  subMinutes,
} from "date-fns";

// Configuration import
import { getGoogleStorageProviderConfig } from "@config/google";
import { getEnvConfig } from "@config/env";
import { getMillisecondConfig } from "@config/millisecond";

// Repository import
import { IFileRepository } from "@shared/container/repositories";

// Error import
import { AppError } from "@shared/errors/AppError";

// i18n import
import { i18n, TFunction } from "@shared/i18n";

// Util import
import { executeAction } from "@shared/utils/executeAction";
import { generateRandomFilename } from "@shared/utils/generateRandomFilename";
import { getFileExtensionFromFilename } from "@shared/utils/getFileExtensionFromFilename";
import { isValidMimeTypeExtension } from "@shared/utils/isValidMimeTypeExtension";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Enum import
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { STORAGE_PROVIDER } from "../../types/storageProvider.enum";

// Interface import
import { IStorageProvider } from "../../models/IStorage.provider";

// DTO import
import { IGenerateUploadSignedUrlRequestParamsDTO } from "../../types/IUploadFile.dto";
import { IRemoveFileByNameDTO } from "../../types/IRemoveFile.dto";
import { IGoogleStorageProviderConfigurationDTO } from "./types/IGoogleStorageProvider.dto";

@injectable()
class GoogleStorageProvider implements IStorageProvider {
  public readonly provider_code = STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE;
  public readonly initialization: Promise<void>;
  protected readonly configuration: IGoogleStorageProviderConfigurationDTO;

  private provider: Storage;
  private bucket: Bucket;

  constructor(
    @inject("FileRepository")
    private fileRepository: IFileRepository,
  ) {
    const googleStorageProviderConfig = getGoogleStorageProviderConfig();

    this.configuration = {
      project_id: googleStorageProviderConfig.project_id,
      client_email: googleStorageProviderConfig.client_email,
      bucket_name: googleStorageProviderConfig.bucket_name,
      private_key: googleStorageProviderConfig.private_key,
    };

    this.initialization = executeAction({
      action: () => this.getProvider({ language: "en" }),
      actionName: "Google storage provider init",
      retryDelay: 30 * 1000, // 30 seconds
      logging: true,
    });
  }

  private async getProvider(params: { language: string }): Promise<{
    provider: Storage;
    bucket: Bucket;
    t: TFunction;
  }> {
    const { language } = params;

    const t = await i18n(language);

    if (!this.provider || !this.bucket) {
      if (
        !this.configuration.project_id ||
        !this.configuration.client_email ||
        !this.configuration.private_key ||
        !this.configuration.bucket_name
      )
        throw new AppError({
          key: "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
          message: t(
            "@google_storage_provider_get_provider/INVALID_CONFIGURATION",
            "Invalid environment variables.",
          ),
        });

      this.provider = new Storage({
        projectId: this.configuration.project_id,
        credentials: {
          client_email: this.configuration.client_email,
          private_key: this.configuration.private_key,
        },
      });

      if (!this.bucket) {
        try {
          const bucket = this.provider.bucket(this.configuration.bucket_name);
          const exists = await bucket.exists();
          if (!exists[0]) throw new Error();
        } catch (error) {
          throw new AppError({
            key: "@google_storage_provider_get_provider/BUCKET_NOT_FOUND",
            message: t(
              "@google_storage_provider_get_provider/BUCKET_NOT_FOUND",
              "Bucket not found.",
            ),
            statusCode: 500,
            debug: {
              code: this.provider_code,
              configuration: this.configuration,
            },
          });
        }
      }

      this.bucket = this.provider.bucket(this.configuration.bucket_name);
    }

    return {
      provider: this.provider,
      bucket: this.bucket,
      t,
    };
  }

  public async generateUploadSignedUrl(
    params: IGenerateUploadSignedUrlRequestParamsDTO,
  ): Promise<File> {
    const {
      filename,
      size,
      mimeType,
      md5Hash,
      allowPublicAccess,
      cloudDirDestination,
      agentInfo,
      language,
    } = params;

    const { bucket, t } = await this.getProvider({
      language,
    });

    if (
      !cloudDirDestination ||
      cloudDirDestination.includes("/") ||
      cloudDirDestination.includes("\\")
    )
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/INVALID_CLOUD_DIRECTORY",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/INVALID_CLOUD_DIRECTORY",
          "Invalid cloud directory.",
        ),
        statusCode: 500,
      });

    if (!filename)
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/MISSING_FILENAME",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/MISSING_FILENAME",
          "Missing filename.",
        ),
      });

    const extension = getFileExtensionFromFilename(filename);

    if (!extension)
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/MISSING_EXTENSION",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/MISSING_EXTENSION",
          "Missing extension.",
        ),
      });

    if (
      !isValidMimeTypeExtension({
        mimeType,
        extension,
      })
    )
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/INVALID_MIME_TYPE",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/INVALID_MIME_TYPE",
          "Invalid MIME type.",
        ),
      });

    const destinationFilename = generateRandomFilename(filename);
    const destinationFilePath = `${
      getEnvConfig().NODE_ENV
    }/${cloudDirDestination}/${destinationFilename}`;

    const [exists] = await bucket.file(destinationFilePath).exists();

    if (exists)
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/FILE_ALREADY_EXISTS",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/FILE_ALREADY_EXISTS",
          "File already exists.",
        ),
        statusCode: 409,
      });

    const uploadSignedUrlExpirationDate = addMilliseconds(
      new Date(),
      getMillisecondConfig().STORAGE_PROVIDER_PUBLIC_WRITE_URL_EXPIRATION,
    );

    try {
      const [url] = await bucket.file(filename).getSignedUrl({
        version: "v4",
        action: "write",
        expires: uploadSignedUrlExpirationDate,
        contentType: mimeType,
        contentMd5: md5Hash,
      });

      const file = await this.fileRepository.create({
        filename: destinationFilename,
        size,
        mime_type: mimeType,
        md5_hash: md5Hash,

        allow_public_access: allowPublicAccess,

        storage_provider: this.provider_code,
        provider_path: destinationFilePath,
        provider_verified_at: null,

        payload: {
          agentInfo,
        },

        public_url: url,
        public_url_expires_at: uploadSignedUrlExpirationDate,

        type: FILE_TYPE.DATASET,
        provider_status: FILE_PROVIDER_STATUS.PENDING,
      });

      return file;
    } catch (err) {
      throw new AppError({
        key: "@google_storage_provider_generate_upload_signed_url/ERROR",
        message: t(
          "@google_storage_provider_generate_upload_signed_url/ERROR",
          "Error while generating upload URL.",
        ),
        debug: { error: err },
        statusCode: 500,
      });
    }
  }

  public async updatePublicUrl(
    file: File,
    language: string,
    expires_at?: Date,
  ): Promise<File> {
    const { bucket, t } = await this.getProvider({
      language,
    });

    if (!file.allow_public_access) return file;

    if (
      file.public_url &&
      file.public_url_expires_at &&
      isBefore(subMinutes(new Date(), 30), file.public_url_expires_at)
    )
      return file;

    if (
      expires_at &&
      (isBefore(expires_at, new Date()) ||
        isAfter(expires_at, addDays(new Date(), 7)))
    )
      throw new AppError({
        key: "@google_storage_provider_update_public_url/INVALID_EXPIRATION_DATE",
        message: t(
          "@google_storage_provider_update_public_url/INVALID_EXPIRATION_DATE",
          "Invalid expiration date.",
        ),
        statusCode: 500,
        debug: {
          file,
          expires_at,
        },
      });

    try {
      const cloudFile = bucket.file(file.filename);

      const [exists] = await cloudFile.exists();

      if (!exists) {
        await this.fileRepository.updateOne(
          { id: file.id },
          {
            public_url: null,
            public_url_expires_at: null,
            provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
          },
        );
        throw new AppError({
          key: "@google_storage_provider_update_public_url/FILE_NOT_FOUND",
          message: t(
            "@google_storage_provider_update_public_url/FILE_NOT_FOUND",
            "File not found.",
          ),
          debug: {
            file,
          },
        });
      }

      const expires =
        expires_at ||
        addMilliseconds(
          new Date(),
          getMillisecondConfig().STORAGE_PROVIDER_PUBLIC_READ_URL_EXPIRATION,
        );

      const [url] = await cloudFile.getSignedUrl({
        version: "v4",
        action: "read",
        expires,
      });

      const updatedFile = await this.fileRepository.updateOne(
        { id: file.id },
        {
          public_url: url,
          public_url_expires_at: expires,
          provider_status: FILE_PROVIDER_STATUS.READY,
        },
      );

      if (!updatedFile) throw new Error();

      return updatedFile;
    } catch (err) {
      throw new AppError({
        key: "@google_storage_provider_update_public_url/ERROR",
        message: t(
          "@google_storage_provider_update_public_url/ERROR",
          "Error while generating public URL.",
        ),
        debug: { error: err },
        statusCode: 500,
      });
    }
  }

  public async removeFileByPath(params: IRemoveFileByNameDTO): Promise<string> {
    const { path, language } = params;

    const { bucket, t } = await this.getProvider({
      language,
    });

    if (!path)
      throw new AppError({
        key: "@google_storage_provider_remove_file_by_path/MISSING_PATH",
        message: t(
          "@google_storage_provider_remove_file_by_path/MISSING_PATH",
          "Missing path.",
        ),
        debug: {
          path,
        },
      });

    try {
      const [exists] = await bucket.file(path).exists();

      if (!exists)
        throw new AppError({
          key: "@google_storage_provider_remove_file_by_path/FILE_NOT_FOUND",
          message: t(
            "@google_storage_provider_remove_file_by_path/FILE_NOT_FOUND",
            "File not found.",
          ),
          statusCode: 404,
        });

      await bucket.file(path).delete();

      const fileRegistry = await this.fileRepository.findOne({
        provider_path: path,
      });

      if (fileRegistry)
        this.fileRepository.deleteOne({ id: fileRegistry.id }).catch(
          err =>
            new AppError({
              key: "@google_storage_provider_remove_file_by_path/ERROR_WHILE_UPDATING_FILE_REGISTRY",
              message: t(
                "@google_storage_provider_remove_file_by_path/ERROR_WHILE_UPDATING_FILE_REGISTRY",
                "Error while removing file.",
              ),
              debug: { error: err },
              statusCode: 500,
            }),
        );

      return path;
    } catch (err) {
      throw new AppError({
        key: "@google_storage_provider_remove_file_by_path/ERROR",
        message: t(
          "@google_storage_provider_remove_file_by_path/ERROR",
          "Error while removing file.",
        ),
        debug: { error: err },
        statusCode: 500,
      });
    }
  }
}

export { GoogleStorageProvider };
