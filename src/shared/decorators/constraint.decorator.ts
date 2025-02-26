import { Directive } from "type-graphql";
import type { MethodAndPropDecorator } from "type-graphql/build/typings/decorators/types";

export type IConstraintParams = {
  minLength: number;
  maxLength: number;
  format: "email" | "uuid" | "cuid";
};

export function Constraint<K extends keyof IConstraintParams>(
  key: K,
  value: IConstraintParams[K],
): MethodAndPropDecorator & ClassDecorator & ParameterDecorator;
export function Constraint<K extends keyof IConstraintParams>(
  key: K,
  value: IConstraintParams[K],
): MethodAndPropDecorator | ClassDecorator | ParameterDecorator {
  const constraintDecorator = Directive(`@constraint(${key}: ${value})`);

  return (
    targetOrPrototype: object,
    propertyKey: string | symbol | undefined,
    parameterIndexOrDescriptor: number | TypedPropertyDescriptor<object>,
  ) =>
    constraintDecorator(
      targetOrPrototype,
      propertyKey,
      parameterIndexOrDescriptor as any,
    );
}
