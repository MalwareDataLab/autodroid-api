// Entity import
import { File } from "@modules/file/entities/file.entity";

export type IRefreshFileDTO = {
  file: File;

  customPublicUrlExpirationDate?: Date;

  language?: string;
};
