// Type import
import { BaseEntityFields } from "@shared/types/baseEntityFields.type";

// Entity import
import { Processor } from "../entities/processor.entity";

export type ProcessorRelationFields = "user" | "processes";

export type ProcessorForeignKeys = "user_id";

export type IProcessorBase = Omit<Processor, ProcessorRelationFields>;

export type ICreateProcessorDTO = Omit<
  Processor,
  // Base
  | BaseEntityFields
  // Relations
  | ProcessorRelationFields
>;

export type IUpdateProcessorDTO = Partial<
  Omit<ICreateProcessorDTO, ProcessorForeignKeys>
>;

export type IFindProcessorDTO = Partial<
  Pick<
    Processor,
    "id" | "name" | "version" | "image_tag" | "user_id" | "visibility"
  >
>;

export type IFindProcessorPublicOrUserPrivateDTO = Pick<Processor, "user_id">;
