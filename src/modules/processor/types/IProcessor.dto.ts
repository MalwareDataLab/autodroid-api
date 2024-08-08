// Entity import
import { Processor } from "../entities/processor.entity";

export type ProcessorRelationFields = "user";

export type ProcessorForeignKeys = "user_id";

export type IProcessorBase = Omit<Processor, ProcessorRelationFields>;

export type ICreateProcessorDTO = Omit<
  Processor,
  // Base
  | "id"
  | "created_at"
  | "updated_at"
  // Relations
  | ProcessorRelationFields
>;

export type IUpdateProcessorDTO = Partial<
  Omit<ICreateProcessorDTO, ProcessorForeignKeys>
>;

export type IFindProcessorDTO = {
  id?: Processor["id"];
  name?: Processor["name"];
  version?: Processor["version"];
  image_tag?: Processor["image_tag"];
  user_id?: Processor["user_id"];
  visibility?: Processor["visibility"];
};
