import {
  Authorized,
  Directive,
  Field,
  ID,
  Int,
  ObjectType,
} from "type-graphql";
import { Exclude, Type } from "class-transformer";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";
import { BigIntScalar } from "@shared/types/bigInt.scalar";

// Type import
import { ProcessingEntityType } from "@shared/types/models";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { File } from "@modules/file/entities/file.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Worker } from "@modules/worker/entities/worker.entity";
import { Processor } from "@modules/processor/entities/processor.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { ProcessingParameter } from "./processingParameter.entity";
import { ProcessingFinishTimeEstimation } from "./processingFinishTimeEstimation.entity";

// Enum import
import { PROCESSING_STATUS } from "../types/processingStatus.enum";
import { PROCESSING_VISIBILITY } from "../types/processingVisibility.enum";

@ObjectType()
class Processing implements ProcessingEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => BigIntScalar)
  seq: bigint;

  @Field(() => PROCESSING_STATUS)
  status: PROCESSING_STATUS;

  @Field(() => PROCESSING_VISIBILITY)
  visibility: PROCESSING_VISIBILITY;

  @Field(() => Date, { nullable: true })
  started_at: Date | null;

  @Field(() => Date, { nullable: true })
  finished_at: Date | null;

  @Field(() => Date, { nullable: true })
  keep_until: Date | null;

  @Field(() => Date, { nullable: true })
  archived_at: Date | null;

  @Field(() => Date, { nullable: true })
  verified_at: Date | null;

  @Field(() => Int, { nullable: true })
  attempts: number | null;

  @Field(() => String, { nullable: true })
  message: string | null;

  @Field(() => [ProcessingParameter])
  @Type(() => ProcessingParameter)
  configuration: Record<string, any>;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Computed fields */

  // See ProcessingFieldResolver
  @Exclude()
  estimated_finish: ProcessingFinishTimeEstimation | null;

  /* Relations */

  @Field()
  user_id: string;

  @Type(() => User)
  @Field(() => User)
  user: User;

  @Field()
  processor_id: string;

  @Field(() => Processor)
  @Type(() => Processor)
  processor: Processor;

  @Field()
  dataset_id: string;

  @Field(() => Dataset)
  @Type(() => Dataset)
  dataset: Dataset;

  @Field(() => String, { nullable: true })
  worker_id: string | null;

  @Exclude()
  @Type(() => Worker)
  worker: Worker | null;

  @Field(() => String, { nullable: true })
  result_file_id: string | null;

  @Field(() => File, { nullable: true })
  @Type(() => File)
  result_file: File | null;

  @Field(() => String, { nullable: true })
  metrics_file_id: string | null;

  @Field(() => File, { nullable: true })
  @Type(() => File)
  metrics_file: File | null;
}

const PaginatedProcessing = PaginationConnection(Processing);

export type PaginatedProcessing = InstanceType<typeof PaginatedProcessing>;
export { Processing, PaginatedProcessing };
