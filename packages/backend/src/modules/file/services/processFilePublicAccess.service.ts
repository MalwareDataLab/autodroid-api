import { inject, injectable } from "tsyringe";
import { isBefore, subMinutes } from "date-fns";

// i18n import
import { i18n } from "@shared/i18n";

// Error import
import { AppError } from "@shared/errors/AppError";

// Util import
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

  public async execute<T, V>({
    cls,
    obj,
    language = "en",
  }: IRequest<T, V>): Promise<T> {
    const t = await i18n(language);

    const process = (data: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!data) resolve(data);
        else if (Array.isArray(data))
          resolve(
            Promise.all(data.map(item => (!item ? item : process(item)))),
          );
        else if (data instanceof File) {
          if (data.allow_public_access) {
            if (
              data.public_url &&
              data.public_url_expires_at &&
              isBefore(subMinutes(new Date(), 30), data.public_url_expires_at)
            )
              resolve(data);
            else {
              this.storageProvider.updatePublicUrl(data, language).then(
                file => resolve(file),
                error => reject(error),
              );
            }
          } else if (!data.public_url && !data.public_url_expires_at)
            resolve(data);
          else {
            this.fileRepository
              .updateOne(
                { id: data.id },
                {
                  allow_public_access: false,
                  public_url: null,
                  public_url_expires_at: null,
                },
              )
              .then(file => {
                if (!file)
                  reject(
                    new AppError({
                      key: "@process_file_public_access/FAIL_TO_REMOVE_PUBLIC_ACCESS",
                      message: t(
                        "@process_file_public_access/FAIL_TO_REMOVE_PUBLIC_ACCESS",
                        "Error while removing public URL.",
                      ),
                      debug: { error: file },
                      statusCode: 500,
                    }),
                  );
                else resolve(file);
              });
          }
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
