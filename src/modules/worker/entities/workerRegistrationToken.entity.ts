import { Exclude, Type } from "class-transformer";
import { Field, ID, ObjectType } from "type-graphql";

// Type import
import { WorkerRegistrationTokenEntityType } from "@shared/types/models";

// Entity import
import { User } from "@modules/user/entities/user.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { Worker } from "./worker.entity";

@ObjectType()
class WorkerRegistrationToken implements WorkerRegistrationTokenEntityType {
  @Field(() => ID)
  id: string;

  @Field()
  token: string;

  @Field()
  is_unlimited_usage: boolean;

  @Field(() => Date, { nullable: true })
  activated_at: Date | null;

  @Field(() => Date, { nullable: true })
  expires_at: Date | null;

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

  @Exclude()
  @Type(() => Worker)
  workers: Worker[];
}
const PaginatedWorkerRegistrationToken = PaginationConnection(
  WorkerRegistrationToken,
);

export type PaginatedWorkerRegistrationToken = InstanceType<
  typeof PaginatedWorkerRegistrationToken
>;
export { WorkerRegistrationToken, PaginatedWorkerRegistrationToken };
