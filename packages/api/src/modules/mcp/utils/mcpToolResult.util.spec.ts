import { describe, expect, it } from "vitest";

// Target import
import {
  checkedAtResult,
  namedFieldResult,
  defaultResult,
  wholeListResult,
} from "./mcpToolResult.util";

describe("Util: MCP tool results", () => {
  describe("defaultResult", () => {
    it("should return the value of the operation's field", () => {
      expect(defaultResult({ userDataset: { id: "d1" } })).toEqual({
        id: "d1",
      });
    });

    it("should flatten a connection to one page", () => {
      expect(
        defaultResult({
          userDatasets: {
            edges: [{ node: { id: "d1" } }, { node: { id: "d2" } }],
            totalCount: 7,
            pageInfo: { hasNextPage: true },
          },
        }),
      ).toEqual({
        items: [{ id: "d1" }, { id: "d2" }],
        total_count: 7,
        has_next_page: true,
      });
    });

    it("should keep a null value as it is", () => {
      expect(defaultResult({ userDataset: null })).toBeNull();
    });
  });

  describe("wholeListResult", () => {
    it("should return a list the API gives whole as a single page", () => {
      expect(
        wholeListResult({ userMcpAuthorizationGrants: [{ id: "g1" }] }),
      ).toEqual({
        items: [{ id: "g1" }],
        total_count: 1,
        has_next_page: false,
      });
    });

    it("should return an empty list as an empty page", () => {
      expect(wholeListResult({ userMcpAuthorizationGrants: [] })).toEqual({
        items: [],
        total_count: 0,
        has_next_page: false,
      });
    });
  });

  describe("namedFieldResult", () => {
    it("should name the number the operation returned", () => {
      expect(
        namedFieldResult("removed")({ adminFileRemoveAllDangling: 3 }),
      ).toEqual({ removed: 3 });
    });
  });

  describe("checkedAtResult", () => {
    it("should name the moment a health check answered with", () => {
      expect(
        checkedAtResult({ healthCheck: "2026-01-01T00:00:00.000Z" }),
      ).toEqual({ checked_at: "2026-01-01T00:00:00.000Z" });
    });
  });
});
