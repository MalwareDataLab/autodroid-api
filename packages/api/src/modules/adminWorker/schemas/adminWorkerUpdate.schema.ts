import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@InputType()
class AdminWorkerUpdateSchema {
  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, { nullable: true })
  tags?: string | null;
}

export { AdminWorkerUpdateSchema };
