import { Exclude, Expose, Type } from "class-transformer";
import { Field, ID, ObjectType } from "type-graphql";

// Util import
import { getMcpAuthorizationClientVerifiedHost } from "../utils/getMcpAuthorizationClientVerifiedHost.util";

// Type import
import { McpAuthorizationGrantEntityType } from "@shared/types/models";

// Entity import
import { User } from "@modules/user/entities/user.entity";

// Scalar import
import { BigIntScalar } from "@shared/types/bigInt.scalar";

@ObjectType()
class McpAuthorizationGrant implements McpAuthorizationGrantEntityType {
  @Field(() => ID)
  id: string;

  @Field(() => BigIntScalar)
  seq: bigint;

  @Field()
  client_id: string;

  @Field(() => String, { nullable: true })
  client_name: string | null;

  @Field()
  resource: string;

  @Field(() => [String])
  scopes: string[];

  token_generation: number;

  @Field()
  expires_at: Date;

  @Field(() => Date, { nullable: true })
  revoked_at: Date | null;

  @Field(() => Date, { nullable: true })
  last_used_at: Date | null;

  @Field()
  created_at: Date;

  @Field()
  updated_at: Date;

  /* Computed fields */

  @Field(() => String, {
    nullable: true,
    description:
      "Host that published this client's metadata document, which authenticates it; null for a dynamically registered client, whose name is self-declared and unverified.",
  })
  @Expose()
  get client_verified_host(): string | null {
    return getMcpAuthorizationClientVerifiedHost(this.client_id);
  }

  /* Relations */

  @Field()
  user_id: string;

  @Exclude()
  @Type(() => User)
  user: User;
}

export { McpAuthorizationGrant };
