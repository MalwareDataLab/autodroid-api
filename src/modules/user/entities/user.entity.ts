import { Field, ID, ObjectType } from "type-graphql";
import { Exclude, Expose, Type } from "class-transformer";

// Configuration import
import { getAdminConfig } from "@config/admin";

// Type import
import { UserEntityType } from "@shared/types/models";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processor } from "@modules/processor/entities/processor.entity";
import { UserAuthProviderConn } from "@modules/user/entities/userAuthProviderConn.entity";
import { PaginationConnection } from "@modules/pagination/entities/paginationConnection.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

@ObjectType()
class User implements UserEntityType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => String, { nullable: true })
  name: string | null;

  @Field(() => String, { nullable: true })
  phone_number: string | null;

  @Field(() => String, { nullable: true })
  language: string | null;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Computed fields */

  @Field(() => Boolean)
  @Expose()
  get is_admin(): boolean {
    return (
      !!this.email &&
      !!getAdminConfig().emails.find(adminEmail => adminEmail === this.email)
    );
  }

  /* Relations */

  @Exclude()
  @Type(() => UserAuthProviderConn)
  auth_provider_conns: UserAuthProviderConn[];

  @Exclude()
  @Type(() => Dataset)
  datasets: Dataset[];

  @Exclude()
  @Type(() => Processor)
  processors: Processor[];

  @Exclude()
  @Type(() => WorkerRegistrationToken)
  worker_registration_tokens: WorkerRegistrationToken[];

  @Exclude()
  @Type(() => Worker)
  workers: Worker[];

  @Exclude()
  @Type(() => Processing)
  processes: Processing[];
}

const PaginatedUser = PaginationConnection(User);
export type PaginatedUser = InstanceType<typeof PaginatedUser>;

export { User, PaginatedUser };
