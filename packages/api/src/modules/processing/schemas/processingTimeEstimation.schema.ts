import { IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@ArgsType()
class ProcessingGetEstimatedExecutionTimeSchema {
  @ValidString()
  @IsUUID()
  @Field({ description: "The dataset id." })
  dataset_id: string;

  @ValidString()
  @IsUUID()
  @Field({ description: "The processor id." })
  processor_id: string;
}

@ArgsType()
class ProcessingGetEstimatedFinishTimeSchema {
  @ValidString()
  @IsUUID()
  @Field({ description: "The processing run id." })
  processing_id: string;
}

export {
  ProcessingGetEstimatedExecutionTimeSchema,
  ProcessingGetEstimatedFinishTimeSchema,
};
