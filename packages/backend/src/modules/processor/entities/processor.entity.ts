import { Field, ObjectType } from "type-graphql";

// Scalar import
import { JSONScalar } from "@shared/types/json.scalar";

@ObjectType()
class Processor {
  @Field()
  code: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => [String])
  allowed_params: string[];

  @Field(() => [String])
  allowed_mime_types: string[];

  @Field(() => JSONScalar)
  default_params: Record<string, string>;

  static make(data: Partial<Processor>) {
    const entity = new Processor();
    Object.assign(entity, data);
    return entity;
  }
}

export { Processor };
