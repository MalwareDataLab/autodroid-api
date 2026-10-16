import { describe, expect, it } from "vitest";
import type { TestContext } from "vitest";

// Util import
import { gql } from "@/test/utils/gql.util";
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
  paginationContractCursorOf,
  paginationContractRowId,
} from "./paginationContractFixture.util";
import type {
  PaginationContractPage,
  PaginationContractRow,
  PaginationContractSorting,
} from "./paginationContractFixture.util";

// Constant import
import { TAKE_LIMIT } from "@modules/pagination/constants/paginationLimit.constant";

type PaginationBoundaryArguments = {
  skip?: unknown;
  take?: unknown;
  after?: unknown;
  first?: unknown;
  before?: unknown;
  last?: unknown;
  sorting?: { field: unknown; order: unknown }[];
};

type PaginationBoundaryTransport = "graphql" | "rest";

type PaginationBoundaryRejection = { status: number; codes: unknown[] };

type PaginationBoundaryResponse =
  | { accepted: true; page: PaginationContractPage }
  | ({
      accepted: false;
      transport: PaginationBoundaryTransport;
    } & PaginationBoundaryRejection);

type PaginationBoundaryRequest = (
  argumentsOfPage: PaginationBoundaryArguments,
  scope?: "all" | "in-scope",
) => Promise<PaginationBoundaryResponse>;

type PaginationBoundaryContractSurface = {
  seed: (rows: PaginationContractRow[]) => Promise<void>;
  seedOutOfScope?: (rows: PaginationContractRow[]) => Promise<void>;
  request: PaginationBoundaryRequest;
};

type PaginationBoundaryContractOptions = {
  outOfScopeDescription?: string;
};

type GraphqlPaginationTarget = {
  authorize: "user" | "admin";
  field: string;
  parent?: { field: string; argument: string; id: string };
  filter?: Record<string, { type: string; value: unknown }>;
};

type RestPaginationTarget = {
  authorize: "user" | "admin";
  path: string;
  filter?: Record<string, string>;
};

const ID_DESCENDING = PAGINATION_CONTRACT_SORTING_CASES[6];
const WALK_SORTING_CASES = [
  PAGINATION_CONTRACT_SORTING_CASES[0],
  PAGINATION_CONTRACT_SORTING_CASES[4],
  PAGINATION_CONTRACT_SORTING_CASES[10],
];

const toBoundarySorting = (sorting?: PaginationContractSorting) =>
  sorting?.map(({ field, order }) => ({
    field,
    order: order.toUpperCase(),
  }));

const authorizeAs = (context: TestContext, authorize: "user" | "admin") =>
  authorize === "admin" ? context.adminAuthorized : context.userAuthorized;

const requestGraphqlPage =
  (
    context: TestContext,
    { authorize, field, parent, filter }: GraphqlPaginationTarget,
  ): PaginationBoundaryRequest =>
  async (argumentsOfPage, scope = "all") => {
    const filterEntries = Object.entries(
      scope === "in-scope" && filter ? filter : {},
    );
    const connection = `${field}(
      skip: $skip
      take: $take
      after: $after
      first: $first
      before: $before
      last: $last
      sorting: $sorting
      ${filterEntries.map(([name]) => `${name}: $${name}`).join("\n")}
    ) {
      totalCount
      edges {
        cursor
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }`;
    const query = gql`
      query PaginationBoundary(
        $skip: Int
        $take: Int
        $after: ConnectionCursor
        $first: Int
        $before: ConnectionCursor
        $last: Int
        $sorting: [SortingFieldSchema!]
        ${parent ? "$parentId: String!" : ""}
        ${filterEntries.map(([name, { type }]) => `$${name}: ${type}`).join("\n")}
      ) {
        ${parent ? `${parent.field}(${parent.argument}: $parentId) { ${connection} }` : connection}
      }
    `;

    const response = await authorizeAs(
      context,
      authorize,
    )(context.request.post("/graphql")).send({
      query,
      variables: {
        ...argumentsOfPage,
        ...(parent && { parentId: parent.id }),
        ...Object.fromEntries(
          filterEntries.map(([name, { value }]) => [name, value]),
        ),
      },
    });

    if (response.body.errors)
      return {
        accepted: false,
        transport: "graphql",
        status: response.status,
        codes: response.body.errors.map(
          (error: { extensions?: { code?: unknown } }) =>
            error.extensions?.code,
        ),
      };

    return {
      accepted: true,
      page: parent
        ? response.body.data[parent.field][field]
        : response.body.data[field],
    };
  };

const requestRestPage =
  (
    context: TestContext,
    { authorize, path, filter }: RestPaginationTarget,
  ): PaginationBoundaryRequest =>
  async ({ sorting, ...argumentsOfPage }, scope = "all") => {
    const response = await authorizeAs(
      context,
      authorize,
    )(
      context.request.get(path).query({
        ...argumentsOfPage,
        ...(sorting && { sort: JSON.stringify(sorting) }),
        ...(scope === "in-scope" && filter),
      }),
    ).send();

    if (response.status !== 200)
      return {
        accepted: false,
        transport: "rest",
        status: response.status,
        codes: [response.body.code ?? response.body.message],
      };

    return { accepted: true, page: response.body };
  };

const describePaginationBoundaryContract = (
  surfaceName: string,
  prepareSurface: (
    context: TestContext,
  ) => Promise<PaginationBoundaryContractSurface>,
  { outOfScopeDescription }: PaginationBoundaryContractOptions = {},
) => {
  const prepareSeededSurface = async (context: TestContext) => {
    const surface = await prepareSurface(context);
    await surface.seed(PAGINATION_CONTRACT_ROW_LIST);
    return surface;
  };

  const acceptedPage = (response: PaginationBoundaryResponse) => {
    expect(response).toMatchObject({ accepted: true });
    return describePaginationContractPage(
      (response as { page: PaginationContractPage }).page,
    );
  };

  const walk = async (
    surface: PaginationBoundaryContractSurface,
    sorting: PaginationContractSorting | undefined,
    scope: "all" | "in-scope",
  ) => {
    const boundarySorting = toBoundarySorting(sorting);
    const readPage = async (argumentsOfPage: PaginationBoundaryArguments) => {
      const response = await surface.request(
        { ...argumentsOfPage, sorting: boundarySorting },
        scope,
      );
      if (!response.accepted)
        throw new Error(
          `The walk was refused: ${JSON.stringify(response.codes)}`,
        );
      return response.page;
    };

    const forwardPages = [
      await readPage({ skip: 0, take: PAGINATION_CONTRACT_WALK_PAGE_SIZE }),
    ];
    while (forwardPages[forwardPages.length - 1].pageInfo.hasNextPage) {
      if (forwardPages.length > PAGINATION_CONTRACT_ROW_COUNT)
        throw new Error("The forward walk never ends.");
      // eslint-disable-next-line no-await-in-loop
      const next = await readPage({
        after: forwardPages[forwardPages.length - 1].pageInfo.endCursor,
        first: PAGINATION_CONTRACT_WALK_PAGE_SIZE,
      });
      forwardPages.push(next);
    }

    const backwardPages: PaginationContractPage[] = [];
    let before = forwardPages[forwardPages.length - 1].pageInfo.endCursor;
    let hasPreviousPage = true;
    while (hasPreviousPage) {
      if (backwardPages.length > PAGINATION_CONTRACT_ROW_COUNT)
        throw new Error("The backward walk never ends.");
      // eslint-disable-next-line no-await-in-loop
      const previous = await readPage({
        before,
        last: PAGINATION_CONTRACT_WALK_PAGE_SIZE,
      });
      backwardPages.unshift(previous);
      before = previous.pageInfo.startCursor;
      hasPreviousPage = previous.pageInfo.hasPreviousPage;
    }

    return { forwardPages, backwardPages };
  };

  describe(`${surfaceName}: pagination and sorting through the API`, () => {
    it.for(WALK_SORTING_CASES)(
      "should walk forward to the end and back to the start by $name, with no row twice and none missed",
      async ({ sorting, expected }, context) => {
        const surface = await prepareSeededSurface(context);

        const { forwardPages, backwardPages } = await walk(
          surface,
          sorting,
          "all",
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

    it("should return a middle offset page in the order asked, with the total and both flags", async context => {
      const surface = await prepareSeededSurface(context);

      const response = await surface.request({
        skip: 2,
        take: 3,
        sorting: toBoundarySorting(ID_DESCENDING.sorting),
      });

      expect(acceptedPage(response)).toEqual(
        expectedPaginationContractPage({
          labels: ID_DESCENDING.expected.slice(2, 5),
          totalCount: PAGINATION_CONTRACT_ROW_COUNT,
          hasNextPage: true,
          hasPreviousPage: true,
        }),
      );
    });

    it("should list every row newest first, ties by id descending, when nothing is asked", async context => {
      const surface = await prepareSeededSurface(context);

      const response = await surface.request({});

      expect(acceptedPage(response)).toEqual(
        expectedPaginationContractPage({
          labels: PAGINATION_CONTRACT_DEFAULT_ORDER,
          totalCount: PAGINATION_CONTRACT_ROW_COUNT,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      );
    });

    it("should accept a page as large as the cap", async context => {
      const surface = await prepareSeededSurface(context);

      const response = await surface.request({
        skip: 0,
        take: TAKE_LIMIT,
        sorting: toBoundarySorting(PAGINATION_CONTRACT_ID_ASCENDING.sorting),
      });

      expect(acceptedPage(response)).toEqual(
        expectedPaginationContractPage({
          labels: PAGINATION_CONTRACT_ID_ASCENDING.expected,
          totalCount: PAGINATION_CONTRACT_ROW_COUNT,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      );
    });

    it("should refuse a cursor whose row does not exist as a bad request", async context => {
      const surface = await prepareSeededSurface(context);

      const response = await surface.request({
        after: paginationContractCursorOf({
          ...PAGINATION_CONTRACT_ROWS.R4,
          id: paginationContractRowId(999),
        }),
        first: 2,
      });

      expect(response).toEqual({
        accepted: false,
        transport: expect.any(String),
        ...{
          graphql: { status: 200, codes: ["@pagination/CURSOR_NOT_FOUND"] },
          rest: { status: 400, codes: ["@pagination/CURSOR_NOT_FOUND"] },
        }[(response as { transport: PaginationBoundaryTransport }).transport],
      });
    });

    const validCursor = paginationContractCursorOf(PAGINATION_CONTRACT_ROWS.R4);

    const SCHEMA_REFUSAL = {
      graphql: { status: 200, codes: ["GRAPHQL_VALIDATION_FAILED"] },
      rest: { status: 400, codes: ["@general/VALIDATION_FAIL"] },
    };
    const VARIABLE_REFUSAL = {
      ...SCHEMA_REFUSAL,
      graphql: { status: 200, codes: ["BAD_USER_INPUT"] },
    };
    const SORTING_REFUSAL = {
      ...SCHEMA_REFUSAL,
      rest: { status: 400, codes: ["Invalid sorting."] },
    };

    it.for([
      ["a take of zero", { skip: 0, take: 0 }, SCHEMA_REFUSAL],
      ["a negative take", { skip: 0, take: -1 }, SCHEMA_REFUSAL],
      [
        "a take above the cap",
        { skip: 0, take: TAKE_LIMIT + 1 },
        SCHEMA_REFUSAL,
      ],
      ["a fractional take", { skip: 0, take: 1.5 }, VARIABLE_REFUSAL],
      ["a negative skip", { skip: -1, take: 2 }, SCHEMA_REFUSAL],
      ["a skip without a take", { skip: 2 }, SCHEMA_REFUSAL],
      ["a take without a skip", { take: 2 }, SCHEMA_REFUSAL],
      ["a first without its cursor", { first: 2 }, SCHEMA_REFUSAL],
      ["a last without its cursor", { last: 2 }, SCHEMA_REFUSAL],
      [
        "an after cursor without its size",
        { after: validCursor },
        SCHEMA_REFUSAL,
      ],
      [
        "a before cursor without its size",
        { before: validCursor },
        SCHEMA_REFUSAL,
      ],
      ["a first of zero", { after: validCursor, first: 0 }, SCHEMA_REFUSAL],
      [
        "a first above the cap",
        { after: validCursor, first: TAKE_LIMIT + 1 },
        SCHEMA_REFUSAL,
      ],
      ["a last of zero", { before: validCursor, last: 0 }, SCHEMA_REFUSAL],
      [
        "a last above the cap",
        { before: validCursor, last: TAKE_LIMIT + 1 },
        SCHEMA_REFUSAL,
      ],
      [
        "a cursor together with skip and take",
        { after: validCursor, first: 2, skip: 0, take: 2 },
        SCHEMA_REFUSAL,
      ],
      [
        "an after and a before cursor together",
        { after: validCursor, first: 2, before: validCursor, last: 2 },
        SCHEMA_REFUSAL,
      ],
      [
        "a cursor that is not base64",
        { after: "not-a-cursor!", first: 2 },
        {
          ...SCHEMA_REFUSAL,
          graphql: { status: 200, codes: ["@pagination/INVALID_PAGINATION"] },
        },
      ],
      [
        "base64 that is not a cursor",
        { after: "bm9wZQ==", first: 2 },
        VARIABLE_REFUSAL,
      ],
      [
        "a cursor with a date that is not one",
        {
          after: Buffer.from(
            JSON.stringify({ created_at: "x", id: "y" }),
          ).toString("base64"),
          first: 2,
        },
        VARIABLE_REFUSAL,
      ],
      [
        "a sorting field that is not sortable",
        { sorting: [{ field: "name", order: "ASC" }] },
        SORTING_REFUSAL,
      ],
      [
        "a sorting order that is not one",
        { sorting: [{ field: "created_at", order: "SIDEWAYS" }] },
        VARIABLE_REFUSAL,
      ],
      ["an empty sorting", { sorting: [] }, SORTING_REFUSAL],
      [
        "the same sorting field twice",
        {
          sorting: [
            { field: "id", order: "ASC" },
            { field: "id", order: "DESC" },
          ],
        },
        SORTING_REFUSAL,
      ],
      [
        "more sorting fields than allowed",
        {
          sorting: [
            { field: "created_at", order: "ASC" },
            { field: "updated_at", order: "ASC" },
            { field: "id", order: "ASC" },
            { field: "created_at", order: "DESC" },
          ],
        },
        SORTING_REFUSAL,
      ],
    ] as const)(
      "should refuse %s as a bad request, not a server failure",
      async ([, argumentsOfPage, refusal], context) => {
        const surface = await prepareSurface(context);

        const response = await surface.request(
          argumentsOfPage as PaginationBoundaryArguments,
        );

        expect(response).toEqual({
          accepted: false,
          transport: expect.any(String),
          ...refusal[
            (response as { transport: PaginationBoundaryTransport }).transport
          ],
        });
      },
    );

    if (outOfScopeDescription)
      describe(`scoping: ${outOfScopeDescription}`, () => {
        it("should keep the rows out of the page, the total and a cursor walk in both directions", async context => {
          const surface = await prepareSeededSurface(context);
          await surface.seedOutOfScope!(
            PAGINATION_CONTRACT_OUT_OF_SCOPE_ROW_LIST,
          );

          const { forwardPages, backwardPages } = await walk(
            surface,
            PAGINATION_CONTRACT_ID_ASCENDING.sorting,
            "in-scope",
          );

          expectPaginationContractIdAscendingWalk(forwardPages, backwardPages);
        });
      });
  });
};

export type { PaginationBoundaryContractSurface };
export {
  describePaginationBoundaryContract,
  requestGraphqlPage,
  requestRestPage,
};
