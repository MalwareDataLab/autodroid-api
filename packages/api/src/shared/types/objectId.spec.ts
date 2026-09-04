import { describe, expect, it } from "vitest";
import { Kind } from "graphql";
import mongoose from "mongoose";

// Test target import
import { ObjectId } from "./objectId";

describe("Scalar: ObjectId", () => {
  it("should serialize an ObjectId to its hex string", () => {
    const value = new mongoose.Types.ObjectId();
    expect(ObjectId.serialize(value)).toBe(value.toHexString());
  });

  it("should throw when serializing a non-ObjectId value", () => {
    expect(() => ObjectId.serialize("not-an-object-id")).toThrowError(
      "ObjectIdScalar can only serialize ObjectId values",
    );
  });

  it("should parse a string value into an ObjectId", () => {
    const hex = new mongoose.Types.ObjectId().toHexString();
    expect(ObjectId.parseValue(hex).toHexString()).toBe(hex);
  });

  it("should throw when parsing a non-string value", () => {
    expect(() => ObjectId.parseValue(123)).toThrowError(
      "ObjectIdScalar can only parse string values",
    );
  });

  it("should parse a string literal into an ObjectId", () => {
    const hex = new mongoose.Types.ObjectId().toHexString();
    const result = ObjectId.parseLiteral(
      { kind: Kind.STRING, value: hex } as any,
      undefined,
    );
    expect(result.toHexString()).toBe(hex);
  });

  it("should throw when the literal is not a string", () => {
    expect(() =>
      ObjectId.parseLiteral({ kind: Kind.INT, value: "1" } as any, undefined),
    ).toThrowError("ObjectIdScalar can only parse string values");
  });
});
