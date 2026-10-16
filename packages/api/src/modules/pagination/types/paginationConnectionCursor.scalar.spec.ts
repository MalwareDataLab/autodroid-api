import { faker } from "@faker-js/faker";
import { GraphQLError, Kind } from "graphql";
import { describe, expect, it } from "vitest";

// Type import
import { Cursor } from "./IPagination.type";

// Target import
import {
  ConnectionCursor,
  isCursor,
  serializeCursor,
  parseCursor,
} from "./paginationConnectionCursor.scalar";

const buildCursor = (): Cursor => ({
  created_at: faker.date.recent(),
  id: faker.string.uuid(),
});

const encodeCursor = (cursor: unknown): string =>
  Buffer.from(JSON.stringify(cursor)).toString("base64");

describe("Scalar: ConnectionCursor", () => {
  describe("isCursor", () => {
    it("should return true for a valid cursor", () => {
      expect(isCursor(buildCursor())).toBe(true);
    });

    it("should return false for a nullish value", () => {
      expect(isCursor(null)).toBe(false);
      expect(isCursor(undefined)).toBe(false);
    });

    it("should return false for a non-object value", () => {
      expect(isCursor("cursor")).toBe(false);
    });

    it("should return false when the key count does not match", () => {
      expect(isCursor({ created_at: new Date() })).toBe(false);
    });

    it("should return false when the keys are in the wrong order", () => {
      expect(isCursor({ id: "1", created_at: new Date() })).toBe(false);
    });

    it("should return false when a key does not match", () => {
      expect(isCursor({ created_at: new Date(), foo: "bar" })).toBe(false);
    });

    it("should accept the date as the ISO text a parsed cursor carries", () => {
      expect(
        isCursor({ created_at: "2026-01-01T00:00:00.000Z", id: "row-1" }),
      ).toBe(true);
    });

    it.each([
      ["a date that is not one", { created_at: "x", id: "row-1" }],
      ["an invalid Date", { created_at: new Date("x"), id: "row-1" }],
      ["a missing date", { created_at: null, id: "row-1" }],
      ["an id that is not text", { created_at: new Date(), id: 7 }],
      ["an id that is a list", { created_at: new Date(), id: ["row-1"] }],
      ["a year alone as the date", { created_at: "2026", id: "row-1" }],
      [
        "a day that does not exist",
        { created_at: "2026-02-30T00:00:00.000Z", id: "row-1" },
      ],
      [
        "a leap day in a common year",
        { created_at: "2026-02-29T00:00:00.000Z", id: "row-1" },
      ],
      [
        "a year past 9999",
        { created_at: "+010000-01-01T00:00:00.000Z", id: "row-1" },
      ],
      [
        "a leap second",
        { created_at: "2026-01-01T23:59:60.000Z", id: "row-1" },
      ],
      ["a date without a time", { created_at: "2026-01-01", id: "row-1" }],
      [
        "a time without a zone",
        { created_at: "2026-01-01T00:00:00", id: "row-1" },
      ],
      ["an empty id", { created_at: new Date(), id: "" }],
    ])("should return false for %s", (_label, value) => {
      expect(isCursor(value)).toBe(false);
    });
  });

  describe("serializeCursor", () => {
    it("should serialize a valid cursor to base64", () => {
      const cursor = buildCursor();
      const serialized = serializeCursor(cursor);
      expect(JSON.parse(Buffer.from(serialized, "base64").toString())).toEqual(
        JSON.parse(JSON.stringify(cursor)),
      );
    });

    it("should throw when the cursor is invalid", () => {
      expect(() => serializeCursor({})).toThrowError(
        new GraphQLError("Fail to serialize the cursor"),
      );
    });
  });

  describe("parseCursor", () => {
    it("should parse a valid base64 cursor", () => {
      const cursor = buildCursor();
      expect(parseCursor(encodeCursor(cursor))).toEqual(
        JSON.parse(JSON.stringify(cursor)),
      );
    });

    it("should throw when the decoded value is not a cursor", () => {
      expect(() => parseCursor(encodeCursor({ foo: "bar" }))).toThrowError(
        new GraphQLError("ConnectionCursor must be a cursor"),
      );
    });
  });

  describe("serialize", () => {
    it("should return a base64 string as-is", () => {
      const encoded = encodeCursor(buildCursor());
      expect(ConnectionCursor.serialize(encoded)).toBe(encoded);
    });

    it("should serialize a cursor object", () => {
      const cursor = buildCursor();
      expect(ConnectionCursor.serialize(cursor)).toBe(serializeCursor(cursor));
    });
  });

  describe("parseValue", () => {
    it("should throw when the value is not a string", () => {
      expect(() => ConnectionCursor.parseValue(123)).toThrowError(
        new GraphQLError("ConnectionCursor must be a string."),
      );
    });

    it("should return a non-base64 string unchanged", () => {
      expect(ConnectionCursor.parseValue("abc")).toBe("abc");
    });

    it("should parse a base64 cursor string", () => {
      const cursor = buildCursor();
      expect(ConnectionCursor.parseValue(encodeCursor(cursor))).toEqual(
        JSON.parse(JSON.stringify(cursor)),
      );
    });
  });

  describe("parseLiteral", () => {
    it("should throw when the literal is not a string", () => {
      expect(() =>
        ConnectionCursor.parseLiteral(
          { kind: Kind.INT, value: "1" } as any,
          undefined,
        ),
      ).toThrowError(new GraphQLError("ConnectionCursor must be a string."));
    });

    it("should return a non-base64 string literal unchanged", () => {
      expect(
        ConnectionCursor.parseLiteral(
          { kind: Kind.STRING, value: "abc" } as any,
          undefined,
        ),
      ).toBe("abc");
    });

    it("should parse a base64 cursor string literal", () => {
      const cursor = buildCursor();
      expect(
        ConnectionCursor.parseLiteral(
          { kind: Kind.STRING, value: encodeCursor(cursor) } as any,
          undefined,
        ),
      ).toEqual(JSON.parse(JSON.stringify(cursor)));
    });
  });
});
