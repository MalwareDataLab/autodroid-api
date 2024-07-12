import { Type } from "class-transformer";
import { Field, ID, ObjectType } from "type-graphql";

// Type import
import { DatasetEntityType } from "@shared/types/models";

// Enum import

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { User } from "@modules/user/entities/user.entity";
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

@ObjectType()
class Dataset implements DatasetEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String, { nullable: true })
  tags: string | null;

  @Field(() => DATASET_VISIBILITY)
  visibility: DATASET_VISIBILITY;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Relations */

  @Field()
  user_id: string;

  @Type(() => User)
  @Field(() => User)
  user: User;

  @Field()
  file_id: string;

  @Type(() => File)
  @Field(() => File)
  file: File;
}

export { Dataset };
