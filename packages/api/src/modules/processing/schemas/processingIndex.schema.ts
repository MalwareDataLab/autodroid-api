import { IsBoolean, IsEnum, IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { BooleanStringTransform } from "@shared/decorators/booleanStringTransform.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

@ArgsType()
class ProcessingIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only runs of this processor.",
  })
  processor_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only runs of this dataset.",
  })
  dataset_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_STATUS)
  @Field(() => PROCESSING_STATUS, {
    nullable: true,
    description: "Only runs in this status.",
  })
  status?: PROCESSING_STATUS;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_VISIBILITY)
  @Field(() => PROCESSING_VISIBILITY, {
    nullable: true,
    description: "Only runs with this visibility.",
  })
  visibility?: PROCESSING_VISIBILITY;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only runs that already started.",
  })
  started?: boolean;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Only runs that already finished.",
  })
  finished?: boolean;
}

export { ProcessingIndexSchema };
