import { describe, expect, it } from "vitest";
import { Exclude } from "class-transformer";

// Test target import
import { parse, process } from ".";

class SampleEntity {
  id: string;

  name: string;

  @Exclude()
  secret: string;
}

describe("Utils: instanceParser", () => {
  describe("parse", () => {
    it("should convert a plain object into a class instance ignoring decorators", () => {
      const result = parse(SampleEntity, {
        id: "1",
        name: "sample",
        secret: "kept",
      });

      expect(result).toBeInstanceOf(SampleEntity);
      expect(result.secret).toBe("kept");
    });

    it("should convert an array of plain objects into class instances", () => {
      const result = parse(SampleEntity, [
        { id: "1", name: "one", secret: "a" },
        { id: "2", name: "two", secret: "b" },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SampleEntity);
    });

    it("should return null when the object is null", () => {
      expect(parse(SampleEntity, null)).toBeNull();
    });
  });

  describe("process", () => {
    it("should convert a class instance into a plain object applying decorators", () => {
      const instance = parse(SampleEntity, {
        id: "1",
        name: "sample",
        secret: "hidden",
      });

      const result = process(instance);

      expect(result).toEqual({ id: "1", name: "sample" });
    });

    it("should convert an array of class instances into plain objects", () => {
      const instances = parse(SampleEntity, [
        { id: "1", name: "one", secret: "a" },
      ]);

      const result = process(instances);

      expect(result).toEqual([{ id: "1", name: "one" }]);
    });

    it("should return null when the object is null", () => {
      expect(process(null)).toBeNull();
    });
  });
});
