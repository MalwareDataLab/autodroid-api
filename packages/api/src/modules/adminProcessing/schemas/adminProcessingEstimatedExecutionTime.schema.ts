import { IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@ArgsType()
class AdminProcessingGetEstimatedExecutionTimeSchema {
  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Limit to this dataset.",
  })
  dataset_id?: string;

  @ValidString({ nullable: "allowUndefined" })
  @IsUUID()
  @Field(() => String, {
    nullable: true,
    description: "Limit to this processor.",
  })
  processor_id?: string;
}

export { AdminProcessingGetEstimatedExecutionTimeSchema };
