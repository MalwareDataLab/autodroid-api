import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@InputType()
class AdminWorkerUpdateSchema {
  @ValidString({ nullable: true })
  @Field(() => String, {
    nullable: true,
    description: "The new description; null clears it.",
  })
  description?: string | null;

  @ValidString({ nullable: true })
  @Field(() => String, {
    nullable: true,
    description: "The new comma-separated tags; null clears them.",
  })
  tags?: string | null;
}

export { AdminWorkerUpdateSchema };
