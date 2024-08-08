import { ObjectType, Field, Int } from "type-graphql";
import { ProcessorParam } from "./processorParam.entity";

@ObjectType()
class ProcessorPayload {
  @Field(() => [ProcessorParam])
  params: ProcessorParam[];

  @Field(() => Int)
  required_ram_mb: number;

  @Field(() => Int)
  required_cpu_cores: number;
}

export { ProcessorPayload };
