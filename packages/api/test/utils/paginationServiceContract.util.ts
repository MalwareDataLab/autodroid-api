import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";

// Util import
import {
  PAGINATION_CONTRACT_DEFAULT_ORDER,
  PAGINATION_CONTRACT_ID_ASCENDING,
  PAGINATION_CONTRACT_OUT_OF_SCOPE_ROW_LIST,
  PAGINATION_CONTRACT_ROWS,
  PAGINATION_CONTRACT_ROW_COUNT,
  PAGINATION_CONTRACT_ROW_LIST,
  PAGINATION_CONTRACT_SORTING_CASES,
  PAGINATION_CONTRACT_WALK_PAGE_SIZE,
  chunkPaginationContractRows,
  chunkPaginationContractRowsFromEnd,
  describePaginationContractPage,
  expectPaginationContractIdAscendingWalk,
  expectedPaginationContractPage,
  paginationContractRowId,
} from "./paginationContractFixture.util";
import type {
  PaginationContractPage,
  PaginationContractRow,
  PaginationContractRowLabel,
  PaginationContractSorting,
} from "./paginationContractFixture.util";

// Constant import
import {
  TAKE_DEFAULT,
  TAKE_LIMIT,
} from "@modules/pagination/constants/paginationLimit.constant";

// DTO import
import type { IPaginationDTO } from "@modules/pagination/types/IPagination.dto";

// Scalar import
import { parseCursor } from "@modules/pagination/types/paginationConnectionCursor.scalar";

type PaginationServiceContractList = (
  pagination?: IPaginationDTO,
  sorting?: PaginationContractSorting,
) => Promise<PaginationContractPage>;

type PaginationServiceContractSurface = {
  seed: (rows: PaginationContractRow[]) => Promise<void>;
  seedOutOfScope?: (rows: PaginationContractRow[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  unlist?: (id: string) => Promise<void>;
  list: PaginationServiceContractList;
  listInScope?: PaginationServiceContractList;
};

type PaginationServiceContractOptions = {
  outOfScopeDescription?: string;
  unlistedDescription?: string;
};

const cursorRequestOf = (label: PaginationContractRowLabel) => ({
  created_at: PAGINATION_CONTRACT_ROWS[label].created_at,
  id: PAGINATION_CONTRACT_ROWS[label].id,
});

const walkForward = async (
  surface: PaginationServiceContractSurface,
  sorting: PaginationContractSorting | undefined,
) => {
  const pages = [
    await surface.list(
      { skip: 0, take: PAGINATION_CONTRACT_WALK_PAGE_SIZE },
      sorting,
    ),
  ];

  while (pages[pages.length - 1].pageInfo.hasNextPage) {
    if (pages.length > PAGINATION_CONTRACT_ROW_COUNT)
      throw new Error("The forward walk never ends.");
    // eslint-disable-next-line no-await-in-loop
    const next = await surface.list(
      {
        after: parseCursor(pages[pages.length - 1].pageInfo.endCursor!),
        first: PAGINATION_CONTRACT_WALK_PAGE_SIZE,
      },
      sorting,
    );
    pages.push(next);
  }

  return pages;
};

const walkBackward = async (
  surface: PaginationServiceContractSurface,
  sorting: PaginationContractSorting | undefined,
  fromCursor: string,
) => {
  const pages: PaginationContractPage[] = [];
  let before = fromCursor;
  let hasPreviousPage = true;

  while (hasPreviousPage) {
    if (pages.length > PAGINATION_CONTRACT_ROW_COUNT)
      throw new Error("The backward walk never ends.");
    // eslint-disable-next-line no-await-in-loop
    const previous = await surface.list(
      { before: parseCursor(before), last: PAGINATION_CONTRACT_WALK_PAGE_SIZE },
      sorting,
    );
    pages.unshift(previous);
    before = previous.pageInfo.startCursor!;
    hasPreviousPage = previous.pageInfo.hasPreviousPage;
  }

  return pages;
};

const describePaginationServiceContract = (
  surfaceName: string,
  prepareSurface: (
    context: TestContext,
  ) => Promise<PaginationServiceContractSurface>,
  {
    outOfScopeDescription,
    unlistedDescription,
  }: PaginationServiceContractOptions = {},
) => {
  const prepareSeededSurface = async (context: TestContext) => {
    const surface = await prepareSurface(context);
    await surface.seed(PAGINATION_CONTRACT_ROW_LIST);
    return surface;
  };

  describe(`${surfaceName}: pagination and sorting contract`, () => {
    describe("sorting", () => {
      it.for(PAGINATION_CONTRACT_SORTING_CASES)(
        "should list every row by $name",
        async ({ sorting, expected }, context) => {
          const surface = await prepareSeededSurface(context);

          const page = await surface.list({}, sorting);

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: expected,
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage: false,
              hasPreviousPage: false,
            }),
          );
        },
      );

      it.for(PAGINATION_CONTRACT_SORTING_CASES)(
        "should return the middle offset page of the order by $name",
        async ({ sorting, expected }, context) => {
          const surface = await prepareSeededSurface(context);

          const page = await surface.list({ skip: 2, take: 3 }, sorting);

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: expected.slice(2, 5),
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage: true,
              hasPreviousPage: true,
            }),
          );
        },
      );

      it.for(PAGINATION_CONTRACT_SORTING_CASES)(
        "should walk forward to the end and back to the start by $name, with no row twice and none missed",
        async ({ sorting, expected }, context) => {
          const surface = await prepareSeededSurface(context);

          const forwardPages = await walkForward(surface, sorting);
          const backwardPages = await walkBackward(
            surface,
            sorting,
            forwardPages[forwardPages.length - 1].pageInfo.endCursor!,
          );

          expect(forwardPages.map(describePaginationContractPage)).toEqual(
            chunkPaginationContractRows(
              expected,
              PAGINATION_CONTRACT_WALK_PAGE_SIZE,
            ).map((labels, index, pages) =>
              expectedPaginationContractPage({
                labels,
                totalCount: PAGINATION_CONTRACT_ROW_COUNT,
                hasNextPage: index < pages.length - 1,
                hasPreviousPage: index > 0,
              }),
            ),
          );
          expect(backwardPages.map(describePaginationContractPage)).toEqual(
            chunkPaginationContractRowsFromEnd(
              expected.slice(0, -1),
              PAGINATION_CONTRACT_WALK_PAGE_SIZE,
            ).map((labels, index) =>
              expectedPaginationContractPage({
                labels,
                totalCount: PAGINATION_CONTRACT_ROW_COUNT,
                hasNextPage: true,
                hasPreviousPage: index > 0,
              }),
            ),
          );
        },
      );
    });

    describe("skip and take", () => {
      const CREATED_AT_ASCENDING = PAGINATION_CONTRACT_SORTING_CASES[1];

      it.for([
        {
          name: "the first page",
          pagination: { skip: 0, take: 3 },
          range: [0, 3],
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          name: "a middle page",
          pagination: { skip: 3, take: 2 },
          range: [3, 5],
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "a page ending one row before the last",
          pagination: { skip: 3, take: 3 },
          range: [3, 6],
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "an exactly full last page",
          pagination: { skip: 4, take: 3 },
          range: [4, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "a partial last page",
          pagination: { skip: 6, take: 3 },
          range: [6, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "an empty page right past the end",
          pagination: { skip: 7, take: 3 },
          range: [7, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "an empty page far past the end",
          pagination: { skip: 500, take: 3 },
          range: [7, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "a single row page",
          pagination: { skip: 0, take: 1 },
          range: [0, 1],
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          name: "the single last row",
          pagination: { skip: 6, take: 1 },
          range: [6, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "a page as large as the cap",
          pagination: { skip: 0, take: TAKE_LIMIT },
          range: [0, 7],
          hasNextPage: false,
          hasPreviousPage: false,
        },
        {
          name: "a request naming no page, which takes the default size",
          pagination: {},
          range: [0, 7],
          hasNextPage: false,
          hasPreviousPage: false,
        },
        {
          name: "a skip without a take, which takes the default size",
          pagination: { skip: 2 },
          range: [2, 7],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "no pagination at all, which an internal read uses for every row",
          pagination: undefined,
          range: [0, 7],
          hasNextPage: false,
          hasPreviousPage: false,
        },
      ])(
        "should return $name with the total and both page flags",
        async (
          { pagination, range, hasNextPage, hasPreviousPage },
          context,
        ) => {
          const surface = await prepareSeededSurface(context);

          const page = await surface.list(
            pagination,
            CREATED_AT_ASCENDING.sorting,
          );

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: CREATED_AT_ASCENDING.expected.slice(range[0], range[1]),
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage,
              hasPreviousPage,
            }),
          );
        },
      );

      it("should cap a request naming no page at the default size and say more follow", async context => {
        const surface = await prepareSurface(context);
        const rows = Array.from({ length: TAKE_DEFAULT + 1 }, (_, index) => ({
          id: paginationContractRowId(1000 + index),
          created_at: new Date(Date.UTC(2024, 1, 1, 0, index)),
          updated_at: new Date(Date.UTC(2024, 1, 1, 0, index)),
        }));
        await surface.seed(rows);

        const page = await surface.list({});

        expect({
          ids: page.edges.map(edge => edge.node.id),
          totalCount: page.totalCount,
          hasNextPage: page.pageInfo.hasNextPage,
          hasPreviousPage: page.pageInfo.hasPreviousPage,
        }).toEqual({
          ids: [...rows]
            .reverse()
            .slice(0, TAKE_DEFAULT)
            .map(row => row.id),
          totalCount: TAKE_DEFAULT + 1,
          hasNextPage: true,
          hasPreviousPage: false,
        });
      });

      it("should return an empty first page with no cursors when nothing is listed", async context => {
        const surface = await prepareSurface(context);

        const page = await surface.list({ skip: 0, take: 3 });

        expect(describePaginationContractPage(page)).toEqual(
          expectedPaginationContractPage({
            labels: [],
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
        );
      });

      it("should return a lone row on a page of its own with no page on either side", async context => {
        const surface = await prepareSurface(context);
        await surface.seed([PAGINATION_CONTRACT_ROWS.R4]);

        const page = await surface.list({ skip: 0, take: 1 });

        expect(describePaginationContractPage(page)).toEqual(
          expectedPaginationContractPage({
            labels: ["R4"],
            totalCount: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }),
        );
      });
    });

    describe("cursors", () => {
      const DEFAULT = PAGINATION_CONTRACT_DEFAULT_ORDER;

      it.for([
        {
          name: "after the first row",
          pagination: { after: cursorRequestOf(DEFAULT[0]), first: 2 },
          labels: DEFAULT.slice(1, 3),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "after a middle row",
          pagination: { after: cursorRequestOf(DEFAULT[2]), first: 2 },
          labels: DEFAULT.slice(3, 5),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "after a row whose page ends one row before the last",
          pagination: { after: cursorRequestOf(DEFAULT[3]), first: 2 },
          labels: DEFAULT.slice(4, 6),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "after a row whose page ends exactly on the last row",
          pagination: { after: cursorRequestOf(DEFAULT[4]), first: 2 },
          labels: DEFAULT.slice(5, 7),
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "after a row with fewer rows left than asked",
          pagination: { after: cursorRequestOf(DEFAULT[4]), first: 5 },
          labels: DEFAULT.slice(5, 7),
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "after the last row",
          pagination: { after: cursorRequestOf(DEFAULT[6]), first: 2 },
          labels: [],
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "a single row after the first row",
          pagination: { after: cursorRequestOf(DEFAULT[0]), first: 1 },
          labels: DEFAULT.slice(1, 2),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "as many rows as the cap after the first row",
          pagination: { after: cursorRequestOf(DEFAULT[0]), first: TAKE_LIMIT },
          labels: DEFAULT.slice(1),
          hasNextPage: false,
          hasPreviousPage: true,
        },
        {
          name: "before the last row",
          pagination: { before: cursorRequestOf(DEFAULT[6]), last: 2 },
          labels: DEFAULT.slice(4, 6),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "before a middle row",
          pagination: { before: cursorRequestOf(DEFAULT[4]), last: 2 },
          labels: DEFAULT.slice(2, 4),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "before a row whose page starts one row after the first",
          pagination: { before: cursorRequestOf(DEFAULT[3]), last: 2 },
          labels: DEFAULT.slice(1, 3),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "before a row whose page starts exactly on the first row",
          pagination: { before: cursorRequestOf(DEFAULT[2]), last: 2 },
          labels: DEFAULT.slice(0, 2),
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          name: "before a row with fewer rows left than asked",
          pagination: { before: cursorRequestOf(DEFAULT[2]), last: 5 },
          labels: DEFAULT.slice(0, 2),
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          name: "before the first row",
          pagination: { before: cursorRequestOf(DEFAULT[0]), last: 2 },
          labels: [],
          hasNextPage: true,
          hasPreviousPage: false,
        },
        {
          name: "a single row before the last row",
          pagination: { before: cursorRequestOf(DEFAULT[6]), last: 1 },
          labels: DEFAULT.slice(5, 6),
          hasNextPage: true,
          hasPreviousPage: true,
        },
        {
          name: "as many rows as the cap before the last row",
          pagination: { before: cursorRequestOf(DEFAULT[6]), last: TAKE_LIMIT },
          labels: DEFAULT.slice(0, 6),
          hasNextPage: true,
          hasPreviousPage: false,
        },
      ] as const)(
        "should return the rows $name",
        async (
          { pagination, labels, hasNextPage, hasPreviousPage },
          context,
        ) => {
          const surface = await prepareSeededSurface(context);

          const page = await surface.list(pagination);

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: [...labels],
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage,
              hasPreviousPage,
            }),
          );
        },
      );

      it.for([
        ["after", { after: cursorRequestOf("R4"), first: 2 }],
        ["before", { before: cursorRequestOf("R4"), last: 2 }],
      ] as const)(
        "should refuse a cursor whose row was deleted, read %s it, as a bad request",
        async ([, pagination], context) => {
          const surface = await prepareSeededSurface(context);
          await surface.remove(PAGINATION_CONTRACT_ROWS.R4.id);

          await expect(surface.list(pagination)).rejects.toMatchObject({
            key: "@pagination/CURSOR_NOT_FOUND",
            statusCode: 400,
          });
        },
      );

      if (unlistedDescription)
        it.for([
          [
            "after",
            { after: cursorRequestOf("R4"), first: 2 },
            {
              labels: ["R5", "R3"],
              hasNextPage: true,
              hasPreviousPage: false,
            },
          ],
          [
            "before",
            { before: cursorRequestOf("R4"), last: 2 },
            {
              labels: ["R7", "R6"],
              hasNextPage: false,
              hasPreviousPage: false,
            },
          ],
        ] as const)(
          `should read %s a cursor whose row is no longer listed (${unlistedDescription}) from where it stood, leaving the far flag unknown as Relay allows`,
          async ([, pagination, expected], context) => {
            const surface = await prepareSeededSurface(context);
            await surface.unlist!(PAGINATION_CONTRACT_ROWS.R4.id);

            const page = await surface.list(pagination);

            expect(describePaginationContractPage(page)).toEqual(
              expectedPaginationContractPage({
                labels: [...expected.labels],
                totalCount: PAGINATION_CONTRACT_ROW_COUNT - 1,
                hasNextPage: expected.hasNextPage,
                hasPreviousPage: expected.hasPreviousPage,
              }),
            );
          },
        );

      it("should refuse a cursor whose date no longer matches its row", async context => {
        const surface = await prepareSeededSurface(context);

        await expect(
          surface.list({
            after: {
              created_at: new Date("2030-01-01T00:00:00.000Z"),
              id: PAGINATION_CONTRACT_ROWS.R4.id,
            },
            first: 2,
          }),
        ).rejects.toMatchObject({
          key: "@pagination/CURSOR_NOT_FOUND",
          statusCode: 400,
        });
      });

      it.for([
        ["after", { after: cursorRequestOf("R4"), first: 2 }],
        ["before", { before: cursorRequestOf("R4"), last: 2 }],
      ] as const)(
        "should refuse any cursor %s it when nothing is listed",
        async ([, pagination], context) => {
          const surface = await prepareSurface(context);

          await expect(surface.list(pagination)).rejects.toMatchObject({
            key: "@pagination/CURSOR_NOT_FOUND",
            statusCode: 400,
          });
        },
      );

      it.for([
        [
          "after the lone row",
          { after: cursorRequestOf("R4"), first: 1 },
          { hasNextPage: false, hasPreviousPage: true },
        ],
        [
          "before the lone row",
          { before: cursorRequestOf("R4"), last: 1 },
          { hasNextPage: true, hasPreviousPage: false },
        ],
      ] as const)(
        "should return no rows %s, flagging the lone row on its side",
        async ([, pagination, flags], context) => {
          const surface = await prepareSurface(context);
          await surface.seed([PAGINATION_CONTRACT_ROWS.R4]);

          const page = await surface.list(pagination);

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: [],
              totalCount: 1,
              ...flags,
            }),
          );
        },
      );

      it.for([
        ["a cursor that is not one", { after: { id: "x" } as never, first: 2 }],
        ["a cursor without its size", { after: cursorRequestOf("R4") }],
        ["a negative skip", { skip: -1, take: 2 }],
      ] as const)(
        "should refuse %s as a bad request before reading anything",
        async ([, pagination], context) => {
          const surface = await prepareSeededSurface(context);

          await expect(surface.list(pagination)).rejects.toMatchObject({
            key: "@pagination/INVALID_PAGINATION",
            statusCode: 400,
          });
        },
      );
    });

    if (outOfScopeDescription)
      describe(`scoping: ${outOfScopeDescription}`, () => {
        const prepareScopedSurface = async (context: TestContext) => {
          const surface = await prepareSeededSurface(context);
          await surface.seedOutOfScope!(
            PAGINATION_CONTRACT_OUT_OF_SCOPE_ROW_LIST,
          );
          return { ...surface, list: surface.listInScope ?? surface.list };
        };

        it("should keep the rows out of the list and out of the total", async context => {
          const surface = await prepareScopedSurface(context);

          const page = await surface.list({});

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: PAGINATION_CONTRACT_DEFAULT_ORDER,
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage: false,
              hasPreviousPage: false,
            }),
          );
        });

        it("should keep the rows out of an offset page and its flags", async context => {
          const surface = await prepareScopedSurface(context);

          const page = await surface.list(
            { skip: 4, take: 3 },
            PAGINATION_CONTRACT_ID_ASCENDING.sorting,
          );

          expect(describePaginationContractPage(page)).toEqual(
            expectedPaginationContractPage({
              labels: PAGINATION_CONTRACT_ID_ASCENDING.expected.slice(4, 7),
              totalCount: PAGINATION_CONTRACT_ROW_COUNT,
              hasNextPage: false,
              hasPreviousPage: true,
            }),
          );
        });

        it("should keep the rows out of a cursor walk in both directions", async context => {
          const surface = await prepareScopedSurface(context);

          const forwardPages = await walkForward(
            surface,
            PAGINATION_CONTRACT_ID_ASCENDING.sorting,
          );
          const backwardPages = await walkBackward(
            surface,
            PAGINATION_CONTRACT_ID_ASCENDING.sorting,
            forwardPages[forwardPages.length - 1].pageInfo.endCursor!,
          );

          expectPaginationContractIdAscendingWalk(forwardPages, backwardPages);
        });
      });
  });
};

export type { PaginationServiceContractSurface };
export { describePaginationServiceContract };
