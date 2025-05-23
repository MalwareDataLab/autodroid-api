import { inject, injectable } from "tsyringe";

// i18n import
import { t } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";
import { parse, ClassConstructor } from "@shared/utils/instanceParser";

// Provider import
import { IStorageProvider } from "@shared/container/providers/StorageProvider/models/IStorage.provider";

// Repository import
import { IFileRepository } from "../repositories/IFile.repository";

// Entity import
import { File } from "../entities/file.entity";

interface IRequest<T, V> {
  cls: ClassConstructor<T>;
  obj: V;
  language?: string;
}

@injectable()
class ProcessFilePublicAccessService {
  constructor(
    @inject("StorageProvider")
    private storageProvider: IStorageProvider,

    @inject("FileRepository")
    private fileRepository: IFileRepository,
  ) {}

  private async process(data: any, language?: string): Promise<any> {
    if (data.allow_public_access || data.upload_url) {
      if (
        !data.upload_url &&
        !data.upload_url_expires_at &&
        data.public_url &&
        data.public_url_expires_at &&
        DateUtils.isBefore(
          new Date(),
          DateUtils.parse(data.public_url_expires_at)
            .subtract(30, "minutes")
            .toDate(),
        )
      )
        return data;

      const file = await this.storageProvider.refreshFile({
        file: data,
        language,
      });

      return file;
    }

    if (!data.public_url && !data.public_url_expires_at) return data;

    const updatedFile = await this.fileRepository.updateOne(
      { id: data.id },
      {
        allow_public_access: false,
        public_url: null,
        public_url_expires_at: null,
      },
    );

    if (!updatedFile)
      throw new AppError({
        key: "@process_file_public_access/FAIL_TO_REMOVE_PUBLIC_ACCESS",
        message: t(
          "@process_file_public_access/FAIL_TO_REMOVE_PUBLIC_ACCESS",
          "Error while removing public URL.",
        ),
        debug: { data },
        statusCode: 500,
      });

    return updatedFile;
  }

  public async execute<T, V>({
    cls,
    obj,
    language = "en",
  }: IRequest<T, V>): Promise<T> {
    const process = (data: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!data) resolve(data);
        else if (Array.isArray(data))
          resolve(
            Promise.all(data.map(item => (!item ? item : process(item)))),
          );
        else if (File.isFile(data)) {
          this.process(data, language)
            .then(file => resolve(file))
            .catch(error => reject(error));
        } else if (data instanceof Object) {
          Object.keys(data)
            .reduce((total, current) => {
              return total.then(() => {
                if (!data[current]) return data[current];
                return process(data[current]).then(
                  processed => {
                    // eslint-disable-next-line no-param-reassign
                    data[current] = processed;
                  },
                  error => reject(error),
                );
              });
            }, Promise.resolve())
            .then(() => resolve(data));
        } else resolve(data);
      });
    };

    try {
      const processed = await process(obj);
      return parse(cls, processed);
    } catch (error) {
      return parse(cls, obj);
    }
  }
}

export { ProcessFilePublicAccessService };
