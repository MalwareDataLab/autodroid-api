import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

@InputType()
class UserDatasetCreateSchema extends RequestFileUploadSignedUrlSchema {
  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  tags?: string | null;
}

@InputType()
class UserDatasetUpdateSchema {
  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  tags?: string | null;
}

export { UserDatasetCreateSchema, UserDatasetUpdateSchema };
