import { describe, expect, it } from "vitest";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

// Test target import
import { makeSortingArr, makeSortingArrWithNulls } from ".";

const options = ["name", "created_at"] as const;

describe("Utils: makeSortingArr", () => {
  describe("makeSortingArr", () => {
    it("should build a sorting array from the sorting object entries", () => {
      const result = makeSortingArr({
        options,
        sorting: [{ field: "name", order: SORT_ORDER.ASC }],
        common: {},
      });

      expect(result).toEqual([{ name: "asc" }]);
    });
  });

  describe("makeSortingArrWithNulls", () => {
    it("should apply the nulls override when present and keep the order otherwise", () => {
      const arr = [{ name: "asc" }, { created_at: "desc" }] as unknown as {
        [key in (typeof options)[number]]: "asc" | "desc";
      }[];

      const result = makeSortingArrWithNulls(arr, { name: "last" });

      expect(result).toEqual([
        { name: { sort: "asc", nulls: "last" } },
        { created_at: "desc" },
      ]);
    });
  });
});
