/* eslint-disable no-use-before-define */
import { Exclude, Type } from "class-transformer";
import { Authorized, Directive, Field, ObjectType } from "type-graphql";

// Entity import
import { UserAuthProviderConn } from "./userAuthProviderConn.entity";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

@ObjectType()
class UserSession {
  @Field()
  access_token: string;

  @Field()
  access_token_expires_at: Date;

  @Field(() => String, { nullable: true })
  refresh_token: string | null;

  @Field(() => Date, { nullable: true })
  refresh_token_expires_at: Date | null;

  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @Exclude()
  @Field(() => JSONScalar)
  payload: Record<string, any>;

  /* Relations */

  @Field()
  user_auth_provider_conn_id: string;

  @Field(() => UserAuthProviderConn)
  @Type(() => UserAuthProviderConn)
  user_auth_provider_conn: UserAuthProviderConn;
}

export { UserSession };
