import { IsBoolean, IsEnum, IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

@ArgsType()
class ProcessingIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  processor_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  dataset_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_STATUS)
  @Field(() => PROCESSING_STATUS, { nullable: true })
  status?: PROCESSING_STATUS;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_VISIBILITY)
  @Field(() => PROCESSING_VISIBILITY, { nullable: true })
  visibility?: PROCESSING_VISIBILITY;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  started?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  finished?: boolean;
}

export { ProcessingIndexSchema };
