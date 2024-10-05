import { Field, ObjectType } from "type-graphql";

@ObjectType()
class ProcessingParameter {
  @Field()
  key: string;

  @Field()
  value: string;
}

export { ProcessingParameter };
