import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsUUID,
  MaxDate,
  MinDate,
} from "class-validator";
import { ArgsType, Field, InputType } from "type-graphql";

// Decorator import
import { BooleanStringTransform } from "@shared/decorators/booleanStringTransform.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Util import
import { DateUtils } from "@shared/utils/dateUtils";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Schema import
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";

@ArgsType()
class AdminProcessingIndexSchema extends ProcessingIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only runs of this user.",
  })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only runs of this worker.",
  })
  worker_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only the run with this result file.",
  })
  result_file_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only the run with this metrics file.",
  })
  metrics_file_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description: "Only runs kept until at least this moment.",
  })
  keep_until_start_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description: "Only runs kept until at most this moment.",
  })
  keep_until_end_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description: "Only runs created at or after this moment.",
  })
  created_at_start_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description: "Only runs created at or before this moment.",
  })
  created_at_end_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @BooleanStringTransform()
  @Field(() => Boolean, {
    nullable: true,
    description: "Also list deleted (archived) runs.",
  })
  include_archived?: boolean;
}

@InputType()
class AdminProcessingUpdateSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_VISIBILITY)
  @Field(() => PROCESSING_VISIBILITY, {
    nullable: true,
    description: "The new visibility.",
  })
  visibility?: PROCESSING_VISIBILITY;

  @IsDate()
  @MinDate(() => new Date(), {
    message: "The date must be greater than or equal to the current date",
  })
  @MaxDate(() => DateUtils.now().add(30, "days").toDate(), {
    message: "The date must be less than or equal to 30 days from now",
  })
  @Type(() => Date)
  @Field(() => Date, {
    description: "The new keep-until moment, from now up to 30 days ahead.",
  })
  keep_until?: Date;
}

@ArgsType()
class AdminProcessingFailDanglingSchema {
  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, {
    nullable: true,
    description:
      "Only runs created before this moment, in the past. Defaults to one day ago.",
  })
  created_at_end_date?: Date;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_STATUS)
  @Field(() => PROCESSING_STATUS, {
    nullable: true,
    description:
      "Only runs in this status, PENDING or RUNNING. Defaults to PENDING.",
  })
  status?: PROCESSING_STATUS;
}

export {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
};
