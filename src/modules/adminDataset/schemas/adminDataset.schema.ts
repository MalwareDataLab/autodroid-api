import { ArgsType, Field, InputType } from "type-graphql";
import { IsEnum, IsUUID } from "class-validator";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";
import { UserDatasetUpdateSchema } from "@modules/dataset/schemas/userDataset.schema";

@ArgsType()
class AdminDatasetIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  file_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(DATASET_VISIBILITY)
  @Field(() => DATASET_VISIBILITY, { nullable: true })
  visibility?: DATASET_VISIBILITY;
}

@InputType()
class AdminDatasetUpdateSchema extends UserDatasetUpdateSchema {}

@InputType()
class AdminDatasetUpdateVisibilitySchema {
  @ValidString()
  @IsEnum(DATASET_VISIBILITY)
  @Field(() => DATASET_VISIBILITY)
  visibility: DATASET_VISIBILITY;
}

export {
  AdminDatasetIndexSchema,
  AdminDatasetUpdateSchema,
  AdminDatasetUpdateVisibilitySchema,
};
