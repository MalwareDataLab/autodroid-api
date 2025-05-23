import { Exclude, Type } from "class-transformer";
import { Authorized, Directive, Field, ID, ObjectType } from "type-graphql";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";
import { BigIntScalar } from "@shared/types/bigInt.scalar";

// Type import
import { WorkerEntityType } from "@shared/types/models";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { Processing } from "@modules/processing/entities/processing.entity";
import { WorkerRegistrationToken } from "./workerRegistrationToken.entity";

@ObjectType()
class Worker implements WorkerEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => BigIntScalar)
  seq: bigint;

  @Field()
  refresh_token: string;

  @Field()
  refresh_token_expires_at: Date;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field()
  internal_id: string;

  @Field()
  signature: string;

  @Field()
  missing: boolean;

  @Field(() => String, { nullable: true })
  version: string | null;

  @Field(() => JSONScalar)
  system_info: Record<string, any>;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  agent_info: Record<string, any>;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => String, { nullable: true })
  tags: string | null;

  @Field(() => Date, { nullable: true })
  last_seen_at: Date | null;

  @Field(() => Date, { nullable: true })
  archived_at: Date | null;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Relations */

  @Field()
  user_id: string;

  @Exclude()
  @Type(() => User)
  user: User;

  @Field()
  registration_token_id: string;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Type(() => WorkerRegistrationToken)
  @Field(() => WorkerRegistrationToken)
  registration_token: WorkerRegistrationToken;

  @Exclude()
  @Type(() => Processing)
  processes: Processing[];
}

const PaginatedWorker = PaginationConnection(Worker);

export type PaginatedWorker = InstanceType<typeof PaginatedWorker>;
export { Worker, PaginatedWorker };
