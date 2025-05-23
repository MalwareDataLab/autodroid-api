import { ArgsType, Field, InputType } from "type-graphql";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsUUID,
  MaxDate,
  MinDate,
} from "class-validator";
import { Type } from "class-transformer";

// Helper import
import { DateUtils } from "@shared/utils/dateUtils";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";
import { IsNullable } from "@shared/decorators/isNullable.decorator";

// Enum import
import { PROCESSING_STATUS } from "@modules/processing/types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "@modules/processing/types/processingVisibility.enum";

// Schema import
import { ProcessingIndexSchema } from "@modules/processing/schemas/processingIndex.schema";

@ArgsType()
class AdminProcessingIndexSchema extends ProcessingIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  worker_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  result_file_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  metrics_file_id?: string;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  keep_until_start_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  keep_until_end_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  created_at_start_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  created_at_end_date?: Date;

  @IsNullable({ nullable: "allowUndefined" })
  @IsBoolean()
  @Field(() => Boolean, { nullable: true })
  include_archived?: boolean;
}

@InputType()
class AdminProcessingUpdateSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_VISIBILITY)
  @Field(() => PROCESSING_VISIBILITY, { nullable: true })
  visibility?: PROCESSING_VISIBILITY;

  @IsDate()
  @MinDate(() => new Date(), {
    message: "The date must be greater than or equal to the current date",
  })
  @MaxDate(() => DateUtils.now().add(30, "days").toDate(), {
    message: "The date must be less than or equal to 30 days from now",
  })
  @Type(() => Date)
  @Field(() => Date)
  keep_until?: Date;
}

@ArgsType()
class AdminProcessingFailDanglingSchema {
  @IsNullable({ nullable: "allowUndefined" })
  @IsDate()
  @Type(() => Date)
  @Field(() => Date, { nullable: true })
  created_at_end_date?: Date;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(PROCESSING_STATUS)
  @Field(() => PROCESSING_STATUS, { nullable: true })
  status?: PROCESSING_STATUS;
}

export {
  AdminProcessingIndexSchema,
  AdminProcessingUpdateSchema,
  AdminProcessingFailDanglingSchema,
};
