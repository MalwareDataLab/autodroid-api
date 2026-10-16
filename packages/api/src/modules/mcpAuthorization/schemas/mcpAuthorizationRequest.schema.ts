import { IsBoolean } from "class-validator";
import { ArgsType, Field } from "type-graphql";

@ArgsType()
class McpAuthorizationRequestDecisionSchema {
  @IsBoolean()
  @Field()
  approve: boolean;
}

export { McpAuthorizationRequestDecisionSchema };
