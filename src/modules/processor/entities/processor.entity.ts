import { Field, ID, ObjectType } from "type-graphql";
import { Type } from "class-transformer";

// Type import
import { ProcessorEntityType } from "@shared/types/models";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

@ObjectType()
class Processor implements Omit<ProcessorEntityType, "params"> {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  version: string;

  @Field()
  image_tag: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String, { nullable: true })
  tags: string | null;

  @Field()
  allowed_mime_types: string;

  @Field(() => PROCESSOR_VISIBILITY)
  visibility: PROCESSOR_VISIBILITY;

  @Field(() => JSONScalar)
  payload: Record<string, any>;

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
}

const PaginatedProcessor = PaginationConnection(Processor);

export type PaginatedProcessor = InstanceType<typeof PaginatedProcessor>;
export { Processor, PaginatedProcessor };
