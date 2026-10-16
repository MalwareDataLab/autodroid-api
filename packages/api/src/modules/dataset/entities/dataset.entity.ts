import { Exclude, Type } from "class-transformer";
import { Field, ID, ObjectType } from "type-graphql";

// Type import
import { DatasetEntityType } from "@shared/types/models";

// Enum import
import { DATASET_VISIBILITY } from "../types/datasetVisibility.enum";

// Entity import
import { File } from "@modules/file/entities/file.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { User } from "@modules/user/entities/user.entity";

// Scalar import
import { BigIntScalar } from "@shared/types/bigInt.scalar";

@ObjectType()
class Dataset implements DatasetEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => BigIntScalar)
  seq: bigint;

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

  // See UserDatasetFieldResolver
  @Type(() => User)
  @Field(() => User, { nullable: true })
  user: User;

  @Field()
  file_id: string;

  @Type(() => File)
  @Field(() => File)
  file: File;

  // See UserDatasetFieldResolver
  @Exclude()
  @Type(() => Processing)
  processes: Processing[];
}

const PaginatedDataset = PaginationConnection(Dataset);

export type PaginatedDataset = InstanceType<typeof PaginatedDataset>;
export { Dataset, PaginatedDataset };
