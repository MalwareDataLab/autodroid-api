import { Field, InputType, Int } from "type-graphql";
import { IsEnum, IsHash, IsMimeType } from "class-validator";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";
import { ValidInt } from "@shared/decorators/validInt.decorator";

@InputType()
class RequestFileUploadSignedUrlSchema {
  @ValidString()
  @Field()
  filename: string;

  @ValidString()
  @IsEnum(MIME_TYPE)
  @IsMimeType()
  @Field(() => MIME_TYPE)
  mime_type: MIME_TYPE;

  @ValidInt()
  @Field(() => Int)
  size: number;

  @ValidString()
  @IsHash("md5")
  @Field()
  md5_hash: string;
}

export { RequestFileUploadSignedUrlSchema };
