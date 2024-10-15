import { container } from "tsyringe";
import crypto from "node:crypto";
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import { plainToInstance } from "class-transformer";

// Entity import
import { File } from "@modules/file/entities/file.entity";

// Type import
import { FactoryParams } from "@/test/types/factoryParams.type";
import { IFileBase, FileRelationFields } from "@modules/file/types/IFile.dto";

// Util import
import { generateEntityBaseData } from "@/test/utils/generateEntityBaseData.util";
import { getBaseFactoryEntityData } from "@/test/utils/getBaseFactoryEntityData.util";
import { loadEntityRelations } from "@/test/utils/loadEntityRelations.util";

// Enum import
import { STORAGE_PROVIDER } from "@modules/file/types/storageProvider.enum";
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";
import { FILE_TYPE } from "@modules/file/types/fileType.enum";
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

class FileFactory extends Factory<File, FactoryParams> {
  static get repository() {
    return container.resolve("FileRepository");
  }
}

const fileFactory = FileFactory.define(
  ({ onCreate, associations, transientParams }) => {
    const base: IFileBase = {
      /** Base */
      ...generateEntityBaseData(),

      /** Entity */
      storage_provider: STORAGE_PROVIDER.GOOGLE_CLOUD_STORAGE,
      provider_path: faker.system.filePath(),
      provider_status: FILE_PROVIDER_STATUS.READY,
      provider_verified_at: faker.date.recent(),
      type: FILE_TYPE.DATASET,
      upload_url: faker.internet.url(),
      upload_url_expires_at: faker.date.future(),

      /** Simulated */
      allow_public_access: false,
      filename: faker.system.fileName(),
      md5_hash: crypto
        .createHash("md5")
        .update(faker.system.fileName())
        .digest("hex"),
      mime_type: MIME_TYPE.CSV,
      payload: {},
      public_url: null,
      public_url_expires_at: null,
      size: faker.number.int(),

      /** Relations */
    };

    onCreate(async item => {
      return FileFactory.repository.createOne(
        getBaseFactoryEntityData({
          base,
          item: await loadEntityRelations(item, []),
        }),
      );
    });

    return plainToInstance(File, {
      ...base,
      ...associations,

      ...(transientParams.withRelations &&
        ({
          dataset: null,
          processes: [],
        } satisfies Pick<File, FileRelationFields>)),
    });
  },
);

export { fileFactory };
