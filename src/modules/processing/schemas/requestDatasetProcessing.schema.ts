import { Field, InputType } from "type-graphql";
import { Type } from "class-transformer";
import { IsArray, IsUUID, ValidateNested } from "class-validator";

// Decorator import
import { ValidString } from "@shared/decorators/validString.decorator";

@InputType()
class RequestDatasetProcessingParameterSchema {
  @ValidString()
  @Field()
  name: string;

  @ValidString()
  @Field()
  value: string;
}

@InputType()
class RequestDatasetProcessingSchema {
  @ValidString()
  @IsUUID()
  @Field()
  processor_id: string;

  @ValidString()
  @IsUUID()
  @Field()
  dataset_id: string;

  @IsArray()
  @ValidateNested()
  @Type(() => RequestDatasetProcessingParameterSchema)
  @Field(() => [RequestDatasetProcessingParameterSchema])
  parameters: RequestDatasetProcessingParameterSchema[];
}

export {
  RequestDatasetProcessingSchema,
  RequestDatasetProcessingParameterSchema,
};
