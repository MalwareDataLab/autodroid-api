import { ObjectType, Field, Int } from "type-graphql";

// Enum import
import { PROCESSOR_PARAMETER_TYPE } from "@modules/processor/types/processorParameterType.enum";

@ObjectType()
class ProcessorParameter {
  @Field(() => Int)
  sequence: number;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PROCESSOR_PARAMETER_TYPE)
  type: PROCESSOR_PARAMETER_TYPE;

  @Field()
  is_required: boolean;

  @Field(() => String, { nullable: true })
  default_value: string | null;
}

export { ProcessorParameter };
