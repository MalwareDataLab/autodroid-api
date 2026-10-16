import { IsEnum, IsUUID } from "class-validator";
import { ArgsType, Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { DATASET_VISIBILITY } from "@modules/dataset/types/datasetVisibility.enum";

// Schema import
import { UserDatasetUpdateSchema } from "@modules/dataset/schemas/userDataset.schema";

@ArgsType()
class AdminDatasetIndexSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only datasets of this user.",
  })
  user_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Only the dataset of this file.",
  })
  file_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsEnum(DATASET_VISIBILITY)
  @Field(() => DATASET_VISIBILITY, {
    nullable: true,
    description: "Only datasets with this visibility.",
  })
  visibility?: DATASET_VISIBILITY;
}

@InputType()
class AdminDatasetUpdateSchema extends UserDatasetUpdateSchema {}

@InputType()
class AdminDatasetUpdateVisibilitySchema {
  @ValidString()
  @IsEnum(DATASET_VISIBILITY)
  @Field(() => DATASET_VISIBILITY, { description: "The new visibility." })
  visibility: DATASET_VISIBILITY;
}

export {
  AdminDatasetIndexSchema,
  AdminDatasetUpdateSchema,
  AdminDatasetUpdateVisibilitySchema,
};
