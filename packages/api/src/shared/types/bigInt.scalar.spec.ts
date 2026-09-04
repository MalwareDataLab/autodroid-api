import { describe, expect, it } from "vitest";
import { GraphQLError, Kind } from "graphql";

// Test target import
import { BigIntScalar } from "./bigInt.scalar";

describe("Scalar: BigIntScalar", () => {
  it("should serialize a numeric string to a bigint", () => {
    expect(BigIntScalar.serialize("123")).toBe(123n);
  });

  it("should throw when serializing a value that cannot be parsed", () => {
    expect(() => BigIntScalar.serialize("abc")).toThrowError(GraphQLError);
  });

  it("should throw when serializing a value with a mismatched representation", () => {
    expect(() => BigIntScalar.serialize("01")).toThrowError(GraphQLError);
  });

  it("should parse a numeric string value to a bigint", () => {
    expect(BigIntScalar.parseValue("456")).toBe(456n);
  });

  it("should throw when parsing an invalid value", () => {
    expect(() => BigIntScalar.parseValue("abc")).toThrowError(GraphQLError);
  });

  it("should throw when parsing a value with a mismatched representation", () => {
    expect(() => BigIntScalar.parseValue("01")).toThrowError(GraphQLError);
  });

  it("should parse an int literal to a bigint", () => {
    expect(
      BigIntScalar.parseLiteral(
        { kind: Kind.INT, value: "789" } as any,
        undefined,
      ),
    ).toBe(789n);
  });

  it("should parse a string literal to a bigint", () => {
    expect(
      BigIntScalar.parseLiteral(
        { kind: Kind.STRING, value: "321" } as any,
        undefined,
      ),
    ).toBe(321n);
  });

  it("should throw when the literal kind is not int nor string", () => {
    expect(() =>
      BigIntScalar.parseLiteral(
        { kind: Kind.BOOLEAN, value: true } as any,
        undefined,
      ),
    ).toThrowError(GraphQLError);
  });

  it("should throw when the literal value cannot be parsed", () => {
    expect(() =>
      BigIntScalar.parseLiteral(
        { kind: Kind.STRING, value: "abc" } as any,
        undefined,
      ),
    ).toThrowError(GraphQLError);
  });

  it("should throw when the literal value has a mismatched representation", () => {
    expect(() =>
      BigIntScalar.parseLiteral(
        { kind: Kind.INT, value: "01" } as any,
        undefined,
      ),
    ).toThrowError(GraphQLError);
  });

  it("should expose the bigint json serialization on the prototype", () => {
    expect((123n as any).toJSON()).toBe("123");
  });
});
