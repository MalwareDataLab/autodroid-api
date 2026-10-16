import { ObjectType, Field } from "type-graphql";

// Entity import
import { ProcessorParameter } from "./processorParameter.entity";

@ObjectType()
class ProcessorConfiguration {
  @Field(() => [ProcessorParameter])
  parameters: ProcessorParameter[];

  @Field()
  dataset_input_argument: string;

  @Field()
  dataset_input_value: string;

  @Field()
  dataset_output_argument: string;

  @Field()
  dataset_output_value: string;

  @Field()
  command: string;

  @Field(() => [String])
  output_result_file_glob_patterns: string[];

  @Field(() => [String])
  output_metrics_file_glob_patterns: string[];
}

export { ProcessorConfiguration };
