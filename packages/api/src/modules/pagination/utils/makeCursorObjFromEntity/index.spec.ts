import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Type import
import { INodeEntity } from "@modules/pagination/types/IPagination.type";

// Test target import
import { makeCursorObjFromEntity } from ".";

describe("Utils: makeCursorObjFromEntity", () => {
  it("should build a cursor object from the entity cursor fields", () => {
    const created_at = faker.date.recent();
    const id = faker.string.uuid();

    const result = makeCursorObjFromEntity({
      id,
      created_at,
      extra: "ignored",
    } as INodeEntity);

    expect(result).toEqual({ created_at, id });
  });

  it("should throw when a cursor field is missing", () => {
    expect(() =>
      makeCursorObjFromEntity({
        id: faker.string.uuid(),
      } as unknown as INodeEntity),
    ).toThrowError("Unable to get cursor value");
  });
});
