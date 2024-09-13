import { Exclude, Type } from "class-transformer";
import { Field, ID, ObjectType } from "type-graphql";
import { JSONScalar } from "@shared/types/json.scalar";

// Type import
import { WorkerEntityType } from "@shared/types/models";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { WorkerRegistrationToken } from "./workerRegistrationToken.entity";

@ObjectType()
class Worker implements WorkerEntityType {
  @Field(() => ID)
  id: string;

  @Field()
  refresh_token: string;

  @Field(() => JSONScalar)
  payload: Record<string, any>;

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

  @Type(() => WorkerRegistrationToken)
  @Field(() => WorkerRegistrationToken)
  registration_token: WorkerRegistrationToken;
}

const PaginatedWorker = PaginationConnection(Worker);

export type PaginatedWorker = InstanceType<typeof PaginatedWorker>;
export { Worker, PaginatedWorker };
