import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

// Schema import
import { RequestFileUploadSignedUrlSchema } from "@modules/file/schemas/requestFileUploadSignedUrl.schema";

@InputType()
class UserDatasetCreateSchema extends RequestFileUploadSignedUrlSchema {
  @ValidString({ nullable: true })
  @Field(() => String, {
    nullable: true,
    description: "What the dataset contains.",
  })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true, description: "Comma-separated tags." })
  tags?: string | null;
}

@InputType()
class UserDatasetUpdateSchema {
  @ValidString({ nullable: true })
  @Field(() => String, {
    nullable: true,
    description: "The new description; null or an omitted one is cleared.",
  })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, {
    nullable: true,
    description:
      "The new comma-separated tags; null or omitted tags are cleared.",
  })
  tags?: string | null;
}

export { UserDatasetCreateSchema, UserDatasetUpdateSchema };
