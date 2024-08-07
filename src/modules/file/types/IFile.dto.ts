// Entity import
import { File } from "../entities/file.entity";

export type ICreateFileDTO = Omit<
  File,
  // Base
  | "id"
  | "created_at"
  | "updated_at"
  // Relations
  | "dataset"
>;

export type IFindFileDTO = AtLeastOneProperty<{
  id?: string;
  provider_path?: string;
  public_url?: string;
}>;

export type IUpdateFileDTO = Partial<ICreateFileDTO>;
