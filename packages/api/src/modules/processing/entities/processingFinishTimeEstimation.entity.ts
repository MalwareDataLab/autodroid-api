import { Field, ObjectType } from "type-graphql";

// Util import
import { parse } from "@shared/utils/instanceParser";

@ObjectType()
class ProcessingFinishTimeEstimation {
  @Field()
  dataset_id: string;

  @Field()
  processor_id: string;

  @Field()
  processing_id: string;

  @Field(() => Date, { nullable: true })
  estimated_start_time: Date | null;

  @Field(() => Date, { nullable: true })
  estimated_finish_time: Date | null;

  static make(data: ProcessingFinishTimeEstimation) {
    return parse(ProcessingFinishTimeEstimation, data);
  }
}

export { ProcessingFinishTimeEstimation };
