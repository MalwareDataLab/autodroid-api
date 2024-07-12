// Entity import
import { Dataset } from "../entities/dataset.entity";

export type ICreateDatasetDTO = Omit<
  Dataset,
  "id" | "created_at" | "updated_at" | "toJSON" | "file" | "user"
> & {
  file_id: string;
  user_id: string;
};

export type IUpdateDatasetDTO = Partial<
  Omit<ICreateDatasetDTO, "user_id" | "file_id">
>;

export type IFindDatasetDTO = {
  id?: Dataset["id"];
  user_id?: Dataset["user_id"];
  file_id?: Dataset["file_id"];
  visibility?: Dataset["visibility"];
};

export type IFindManyPublicOrUserPrivateDTO = {
  user_id: Dataset["user_id"];
};
