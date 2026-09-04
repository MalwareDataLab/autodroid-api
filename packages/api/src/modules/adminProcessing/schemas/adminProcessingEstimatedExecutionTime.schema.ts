import { IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@ArgsType()
class AdminProcessingGetEstimatedExecutionTimeSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  dataset_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, { nullable: true })
  processor_id?: string;
}

export { AdminProcessingGetEstimatedExecutionTimeSchema };
