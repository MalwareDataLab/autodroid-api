import "reflect-metadata";

import { Field, ID, ObjectType, getMetadataStorage } from "type-graphql";
import { describe, expect, it } from "vitest";

// Type import
import { Cursor } from "@modules/pagination/types/IPagination.type";

// Scalar import
import { serializeCursor } from "@modules/pagination/types/paginationConnectionCursor.scalar";

// Target import
import { PaginationConnection } from "./paginationConnection.entity";

@ObjectType()
class Row {
  @Field(() => ID)
  id: string;

  created_at: Date;
}

const Connection = PaginationConnection(Row);

const rows = (count: number, from = 0): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${from + index}`,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, from + index)),
  }));

const cursorOf = (row: Row): Cursor => ({
  created_at: row.created_at,
  id: row.id,
});

const ids = (connection: { edges: { node: Row }[] }) =>
  connection.edges.map(({ node }) => node.id);

describe("Entity: PaginationConnection", () => {
  describe("skip and take", () => {
    it.each([
      ["the first of several pages", 0, 10, 25, 10, true, false],
      ["a middle page", 10, 10, 25, 10, true, true],
      ["the last, partial page", 20, 10, 25, 5, false, true],
      ["a page that ends exactly on the last row", 15, 10, 25, 10, false, true],
      ["a data set of exactly one page", 0, 10, 10, 10, false, false],
      ["a data set smaller than the page", 0, 10, 3, 3, false, false],
      ["an empty data set", 0, 10, 0, 0, false, false],
      ["a page past the end", 100, 10, 25, 0, false, true],
    ])(
      "should describe %s",
      (
        _label,
        skip,
        take,
        totalCount,
        returned,
        hasNextPage,
        hasPreviousPage,
      ) => {
        const connection = Connection.make({
          items: rows(returned),
          totalCount,
          paginationRequest: { skip, take },
        });

        expect(connection.edges).toHaveLength(returned);
        expect(connection.totalCount).toBe(totalCount);
        expect(connection.pageInfo.hasNextPage).toBe(hasNextPage);
        expect(connection.pageInfo.hasPreviousPage).toBe(hasPreviousPage);
      },
    );

    it("should point the cursors at the first and last row of the page", () => {
      const items = rows(3);
      const connection = Connection.make({
        items,
        totalCount: 3,
        paginationRequest: { skip: 0, take: 10 },
      });

      expect(connection.pageInfo.startCursor).toBe(
        serializeCursor(cursorOf(items[0])),
      );
      expect(connection.pageInfo.endCursor).toBe(
        serializeCursor(cursorOf(items[2])),
      );
    });

    it("should have no cursors on an empty page", () => {
      const connection = Connection.make({
        items: [],
        totalCount: 0,
        paginationRequest: { skip: 0, take: 10 },
      });

      expect(connection.pageInfo.startCursor).toBeNull();
      expect(connection.pageInfo.endCursor).toBeNull();
    });

    it("should size a request that names no page by the default, so it reports more rows than it holds", () => {
      const connection = Connection.make({
        items: rows(100),
        totalCount: 250,
        paginationRequest: {},
      });

      expect(connection.edges).toHaveLength(100);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it("should report no next page for an internal read that asked for every row", () => {
      const connection = Connection.make({
        items: rows(250),
        totalCount: 250,
      });

      expect(connection.edges).toHaveLength(250);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe("cursors", () => {
    const all = rows(10);

    it("should return the first page after a cursor and flag that more follow", () => {
      const first = all[2];
      const items = all.slice(2, 2 + 1 + 2 + 1);

      const connection = Connection.make({
        items,
        totalCount: all.length,
        paginationRequest: { after: cursorOf(first), first: 2 },
      });

      expect(ids(connection)).toEqual(["row-3", "row-4"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it("should flag no next page when the rows after the cursor fit", () => {
      const connection = Connection.make({
        items: all.slice(7),
        totalCount: all.length,
        paginationRequest: { after: cursorOf(all[7]), first: 5 },
      });

      expect(ids(connection)).toEqual(["row-8", "row-9"]);
      expect(connection.pageInfo.hasNextPage).toBe(false);
    });

    it("should read backwards from a cursor, dropping the extra far row and flagging earlier pages", () => {
      const connection = Connection.make({
        items: all.slice(1, 5),
        totalCount: all.length,
        paginationRequest: { before: cursorOf(all[4]), last: 2 },
      });

      expect(ids(connection)).toEqual(["row-2", "row-3"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it("should keep the page size backwards when the cursor row itself is not among the rows", () => {
      const connection = Connection.make({
        items: all.slice(0, 4),
        totalCount: all.length,
        paginationRequest: { before: cursorOf(all[4]), last: 2 },
      });

      expect(ids(connection)).toEqual(["row-2", "row-3"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it("should flag no earlier page when the rows before the cursor fit", () => {
      const connection = Connection.make({
        items: all.slice(0, 3),
        totalCount: all.length,
        paginationRequest: { before: cursorOf(all[2]), last: 5 },
      });

      expect(ids(connection)).toEqual(["row-0", "row-1"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it.each([
      ["forward", { after: cursorOf(all[3]), first: 3 }],
      ["backward", { before: cursorOf(all[3]), last: 3 }],
    ])(
      "should refuse a %s cursor whose row is gone and that finds nothing",
      (_label, paginationRequest) => {
        expect(() =>
          Connection.make({ items: [], totalCount: 0, paginationRequest }),
        ).toThrowError(
          expect.objectContaining({
            key: "@pagination/CURSOR_NOT_FOUND",
            statusCode: 400,
          }),
        );
      },
    );

    it.each([
      [
        "forward from the last row",
        { after: cursorOf(all[9]), first: 1 },
        [all[9]],
        { hasPreviousPage: true, hasNextPage: false },
      ],
      [
        "backward from the first row",
        { before: cursorOf(all[0]), last: 1 },
        [all[0]],
        { hasPreviousPage: false, hasNextPage: true },
      ],
    ])(
      "should describe an empty cursor page %s, with no cursors",
      (_label, paginationRequest, items, pageFlags) => {
        const connection = Connection.make({
          items,
          totalCount: all.length,
          paginationRequest,
        });

        expect(connection.edges).toEqual([]);
        expect(connection.pageInfo).toEqual({
          startCursor: null,
          endCursor: null,
          ...pageFlags,
        });
      },
    );

    it("should keep the cursor row in the page when the rows were read without their boundaries", () => {
      const connection = Connection.make({
        items: all.slice(3, 6),
        totalCount: all.length,
        paginationRequest: { after: cursorOf(all[3]), first: 2 },
        hasIncludedBoundaries: false,
      });

      expect(ids(connection)).toEqual(["row-3", "row-4"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it("should treat a cursor that is no longer in the data as a page with no previous one", () => {
      const connection = Connection.make({
        items: all.slice(0, 3),
        totalCount: all.length,
        paginationRequest: {
          after: { created_at: new Date(0), id: "gone" },
          first: 5,
        },
      });

      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(ids(connection)).toEqual(["row-0", "row-1", "row-2"]);
    });
  });

  describe("GraphQL type name", () => {
    const graphqlTypeNameOf = (target: object) =>
      getMetadataStorage().objectTypes.find(
        objectType => objectType.target === target,
      )?.name;

    it("should name the connection type after its entity", () => {
      expect(graphqlTypeNameOf(Connection)).toBe("RowPaginationConnection");
    });

    it("should name the connection type after the entity's description when the entity class has no name", () => {
      const NamelessRow = Object.defineProperty(
        class {
          id: string;

          created_at: Date;
        },
        "name",
        { value: "" },
      );
      Object.defineProperty(NamelessRow, "description", {
        value: "DescribedRow",
      });

      expect(graphqlTypeNameOf(PaginationConnection(NamelessRow))).toBe(
        "DescribedRowPaginationConnection",
      );
    });
  });
});
