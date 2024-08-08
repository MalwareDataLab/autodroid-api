import { PROCESSOR_PARAM_TYPE } from "@modules/processor/types/processorParamType.enum";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
class ProcessorParam {
  @Field(() => Int)
  sequence: number;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => PROCESSOR_PARAM_TYPE)
  type: PROCESSOR_PARAM_TYPE;

  @Field(() => String, { nullable: true })
  default_value: string | null;
}

export { ProcessorParam };
