import { IsString, Matches } from "class-validator";
import { ArgsType, Field } from "type-graphql";

const PKCE_VALUE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const USER_CODE_PATTERN = /^[A-HJ-NP-TV-Z2-9]{8}$/;

@ArgsType()
class CliAuthorizationRegisterSchema {
  @IsString()
  @Matches(PKCE_VALUE_PATTERN)
  @Field()
  code_challenge: string;

  @IsString()
  @Matches(USER_CODE_PATTERN)
  @Field()
  user_code: string;
}

@ArgsType()
class CliAuthorizationAuthorizeSchema {
  @IsString()
  @Matches(USER_CODE_PATTERN)
  @Field()
  user_code: string;
}

@ArgsType()
class CliAuthorizationTokenSchema {
  @IsString()
  @Matches(PKCE_VALUE_PATTERN)
  @Field()
  code_verifier: string;
}

export {
  CliAuthorizationAuthorizeSchema,
  CliAuthorizationRegisterSchema,
  CliAuthorizationTokenSchema,
};
