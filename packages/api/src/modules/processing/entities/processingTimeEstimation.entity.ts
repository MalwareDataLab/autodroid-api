import { Expose } from "class-transformer";
import { Field, Int, ObjectType } from "type-graphql";

// Util import
import { parse } from "@shared/utils/instanceParser";

@ObjectType()
class ProcessingTimeEstimation {
  @Field()
  dataset_id: string;

  @Field()
  processor_id: string;

  @Field(() => Int, {
    nullable: true,
    description:
      "Estimated execution time in seconds after the start of the processing.",
  })
  estimated_execution_time: number | null;

  @Field(() => Int, {
    nullable: true,
    description:
      "Estimated waiting time in seconds before the start of the processing to acquire the available worker.",
  })
  estimated_waiting_time: number | null;

  @Expose()
  @Field(() => Int, {
    nullable: true,
    description:
      "Estimated total time in seconds before the end of the processing.",
  })
  get estimated_total_time(): number | null {
    if (
      this.estimated_execution_time === null ||
      this.estimated_waiting_time === null
    )
      return null;
    return this.estimated_execution_time + this.estimated_waiting_time;
  }

  static make(data: Omit<ProcessingTimeEstimation, "estimated_total_time">) {
    return parse(ProcessingTimeEstimation, data);
  }
}

export { ProcessingTimeEstimation };
