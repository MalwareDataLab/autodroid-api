import { Authorized, Directive, Field, ID, ObjectType } from "type-graphql";
import { Exclude, Type } from "class-transformer";

// Type import
import { ProcessorEntityType } from "@shared/types/models";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { ProcessorConfiguration } from "./processorConfiguration.entity";

// Enum import
import { PROCESSOR_VISIBILITY } from "../types/processorVisibility.enum";

@ObjectType()
class Processor implements ProcessorEntityType {
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

  @Field(() => ProcessorConfiguration)
  configuration: Record<string, any> & ProcessorConfiguration;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Relations */

  @Exclude()
  user_id: string;

  @Type(() => User)
  @Exclude()
  user: User;

  // See UserProcessorFieldResolver
  @Exclude()
  @Type(() => Processing)
  processes: Processing[];
}

const PaginatedProcessor = PaginationConnection(Processor);

export type PaginatedProcessor = InstanceType<typeof PaginatedProcessor>;
export { Processor, PaginatedProcessor };
