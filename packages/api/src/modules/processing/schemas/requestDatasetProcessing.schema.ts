import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { Field, InputType } from "type-graphql";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@InputType()
class RequestDatasetProcessingParameterSchema {
  @ValidString()
  @Field({ description: "The parameter name." })
  name: string;

  @ValidString()
  @Field({ description: "The parameter value." })
  value: string;
}

@InputType()
class RequestDatasetProcessingSchema {
  @ValidString()
  @IsUUID()
  @Field({ description: "The processor id." })
  processor_id: string;

  @ValidString()
  @IsUUID()
  @Field({ description: "The dataset id." })
  dataset_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestDatasetProcessingParameterSchema)
  @Field(() => [RequestDatasetProcessingParameterSchema], {
    description:
      "Processor parameters as name/value pairs; an empty list when there are none.",
  })
  parameters: RequestDatasetProcessingParameterSchema[];
}

export {
  RequestDatasetProcessingSchema,
  RequestDatasetProcessingParameterSchema,
};
