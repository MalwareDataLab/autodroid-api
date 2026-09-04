import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

// eslint-disable-next-line func-names
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const BigIntScalar = new GraphQLScalarType({
  name: "BigInt",
  description:
    "The `BigInt` scalar type represents non-fractional signed whole numeric values.",
  serialize(outputValue: any) {
    try {
      const value = String(outputValue);
      const bigint = BigInt(value);
      if (value !== bigint.toString()) throw new Error();
      return bigint;
    } catch {
      throw new GraphQLError(`BigInt cannot represent value: ${outputValue}`);
    }
  },
  parseValue(inputValue: any) {
    try {
      const value = String(inputValue);
      const bigint = BigInt(value);
      if (value !== bigint.toString()) throw new Error();
      return bigint;
    } catch {
      throw new GraphQLError(`BigInt cannot represent value: ${inputValue}`);
    }
  },
  parseLiteral(ast: any) {
    if (ast.kind !== Kind.INT && ast.kind !== Kind.STRING)
      throw new GraphQLError(`BigInt cannot represent value: ${ast.kind}`);
    try {
      const value = String(ast.value);
      const bigint = BigInt(value);
      if (value !== bigint.toString()) throw new Error();
      return bigint;
    } catch {
      throw new GraphQLError(`BigInt cannot represent value: ${ast.value}`);
    }
  },
  extensions: {
    codegenScalarType: "bigint",
    jsonSchema: {
      type: "integer",
      format: "int64",
    },
  },
});

export { BigIntScalar };
