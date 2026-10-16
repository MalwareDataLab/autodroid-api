import { Field, ObjectType } from "type-graphql";

// Util import
import { parse } from "@shared/utils/instanceParser";

@ObjectType()
class WorkerAccessToken {
  @Field()
  access_token: string;

  @Field()
  access_token_expires_at: Date;

  public static make({
    access_token,
    access_token_expires_at,
  }: WorkerAccessToken) {
    return parse(WorkerAccessToken, {
      access_token,
      access_token_expires_at,
    } as WorkerAccessToken);
  }
}

export { WorkerAccessToken };
