import { IsEnum, IsHash, IsMimeType } from "class-validator";
import { Field, InputType, Int } from "type-graphql";

// Decorator import
import { ValidInt } from "@shared/decorators/validInt.decorator";
import { ValidString } from "@shared/decorators/validString.decorator";

// Enum import
import { MIME_TYPE } from "@modules/file/types/mimeType.enum";

const MIME_TYPE_NAMES = Object.entries(MIME_TYPE)
  .map(([name, value]) => `${name} (${value})`)
  .join(", ")
  .replace(/, (?=[^,]*$)/, " or ");

@InputType()
class RequestFileUploadSignedUrlSchema {
  @ValidString()
  @Field({ description: "The file's name, e.g. samples.csv." })
  filename: string;

  @ValidString()
  @IsEnum(MIME_TYPE)
  @IsMimeType()
  @Field(() => MIME_TYPE, {
    description: `The file's type, by its MIME_TYPE name: ${MIME_TYPE_NAMES}. The upload must send the MIME type it names as its Content-Type.`,
  })
  mime_type: MIME_TYPE;

  @ValidInt()
  @Field(() => Int, { description: "The file's size in bytes." })
  size: number;

  @ValidString()
  @IsHash("md5")
  @Field({ description: "The file's MD5 hash, as 32 hexadecimal characters." })
  md5_hash: string;
}

export { RequestFileUploadSignedUrlSchema };
