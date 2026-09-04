import { ValidString } from "@shared/decorators/validString.decorator";
import { IsUUID } from "class-validator";
import { ArgsType, Field } from "type-graphql";

@ArgsType()
class ProcessingGetEstimatedExecutionTimeSchema {
  @ValidString()
  @IsUUID()
  @Field()
  dataset_id: string;

  @ValidString()
  @IsUUID()
  @Field()
  processor_id: string;
}

@ArgsType()
class ProcessingGetEstimatedFinishTimeSchema {
  @ValidString()
  @IsUUID()
  @Field()
  processing_id: string;
}

export {
  ProcessingGetEstimatedExecutionTimeSchema,
  ProcessingGetEstimatedFinishTimeSchema,
};
