import { expect } from "vitest";

// Type import
import { IPageInfo } from "@modules/pagination/types/IPagination.type";

// Enum import
import { SORT_ORDER } from "@modules/sorting/types/sortOrder.enum";

type PaginationContractRowLabel =
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5"
  | "R6"
  | "R7";

type PaginationContractRow = {
  id: string;
  created_at: Date;
  updated_at: Date;
};

type PaginationContractSortingField = "created_at" | "updated_at" | "id";

type PaginationContractSorting = {
  field: PaginationContractSortingField;
  order: SORT_ORDER;
}[];

type PaginationContractSortingCase = {
  name: string;
  sorting?: PaginationContractSorting;
  expected: PaginationContractRowLabel[];
};

type PaginationContractPage = {
  edges: { node: { id: string | number }; cursor: string }[];
  pageInfo: IPageInfo;
  totalCount: number;
};

const paginationContractRowId = (position: number) =>
  `00000000-0000-4000-8000-${String(position).padStart(12, "0")}`;

const contractRow = (
  position: number,
  createdAt: string,
  updatedAt: string,
): PaginationContractRow => ({
  id: paginationContractRowId(position),
  created_at: new Date(createdAt),
  updated_at: new Date(updatedAt),
});

const PAGINATION_CONTRACT_ROWS: Record<
  PaginationContractRowLabel,
  PaginationContractRow
> = {
  R1: contractRow(10, "2024-01-01T00:00:00.000Z", "2024-03-05T00:00:00.000Z"),
  R2: contractRow(20, "2024-01-02T00:00:00.000Z", "2024-03-01T00:00:00.000Z"),
  R3: contractRow(30, "2024-01-02T00:00:00.000Z", "2024-03-04T00:00:00.000Z"),
  R4: contractRow(40, "2024-01-03T00:00:00.000Z", "2024-03-01T00:00:00.000Z"),
  R5: contractRow(50, "2024-01-02T00:00:00.000Z", "2024-03-02T00:00:00.000Z"),
  R6: contractRow(60, "2024-01-04T00:00:00.000Z", "2024-03-03T00:00:00.000Z"),
  R7: contractRow(70, "2024-01-05T00:00:00.000Z", "2024-03-01T00:00:00.000Z"),
};

const PAGINATION_CONTRACT_ROW_LIST = Object.values(PAGINATION_CONTRACT_ROWS);

const PAGINATION_CONTRACT_OUT_OF_SCOPE_ROW_LIST =
  PAGINATION_CONTRACT_ROW_LIST.map(row => ({
    ...row,
    id: paginationContractRowId(Number(row.id.slice(-12)) + 5),
  }));

const ascending = (field: PaginationContractSortingField) => ({
  field,
  order: SORT_ORDER.ASC,
});
const descending = (field: PaginationContractSortingField) => ({
  field,
  order: SORT_ORDER.DESC,
});

const PAGINATION_CONTRACT_DEFAULT_ORDER: PaginationContractRowLabel[] = [
  "R7",
  "R6",
  "R4",
  "R5",
  "R3",
  "R2",
  "R1",
];

const PAGINATION_CONTRACT_SORTING_CASES: PaginationContractSortingCase[] = [
  {
    name: "no sorting, newest first with ties by id descending",
    expected: PAGINATION_CONTRACT_DEFAULT_ORDER,
  },
  {
    name: "created_at ASC, ties by id descending",
    sorting: [ascending("created_at")],
    expected: ["R1", "R5", "R3", "R2", "R4", "R6", "R7"],
  },
  {
    name: "created_at DESC, ties by id descending",
    sorting: [descending("created_at")],
    expected: PAGINATION_CONTRACT_DEFAULT_ORDER,
  },
  {
    name: "updated_at ASC, ties by created_at descending",
    sorting: [ascending("updated_at")],
    expected: ["R7", "R4", "R2", "R5", "R6", "R3", "R1"],
  },
  {
    name: "updated_at DESC, ties by created_at descending",
    sorting: [descending("updated_at")],
    expected: ["R1", "R3", "R6", "R5", "R7", "R4", "R2"],
  },
  {
    name: "id ASC",
    sorting: [ascending("id")],
    expected: ["R1", "R2", "R3", "R4", "R5", "R6", "R7"],
  },
  {
    name: "id DESC",
    sorting: [descending("id")],
    expected: ["R7", "R6", "R5", "R4", "R3", "R2", "R1"],
  },
  {
    name: "created_at ASC then id ASC",
    sorting: [ascending("created_at"), ascending("id")],
    expected: ["R1", "R2", "R3", "R5", "R4", "R6", "R7"],
  },
  {
    name: "created_at ASC then updated_at DESC",
    sorting: [ascending("created_at"), descending("updated_at")],
    expected: ["R1", "R3", "R5", "R2", "R4", "R6", "R7"],
  },
  {
    name: "updated_at ASC then created_at ASC",
    sorting: [ascending("updated_at"), ascending("created_at")],
    expected: ["R2", "R4", "R7", "R5", "R6", "R3", "R1"],
  },
  {
    name: "created_at DESC then updated_at ASC then id ASC",
    sorting: [
      descending("created_at"),
      ascending("updated_at"),
      ascending("id"),
    ],
    expected: ["R7", "R6", "R4", "R2", "R5", "R3", "R1"],
  },
];

const PAGINATION_CONTRACT_ROW_COUNT = PAGINATION_CONTRACT_ROW_LIST.length;
const PAGINATION_CONTRACT_WALK_PAGE_SIZE = 2;
const PAGINATION_CONTRACT_ID_ASCENDING = PAGINATION_CONTRACT_SORTING_CASES[5];

const chunkPaginationContractRows = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );

const chunkPaginationContractRowsFromEnd = <T>(items: T[], size: number) =>
  chunkPaginationContractRows([...items].reverse(), size)
    .map(page => page.reverse())
    .reverse();

const expectPaginationContractIdAscendingWalk = (
  forwardPages: PaginationContractPage[],
  backwardPages: PaginationContractPage[],
) => {
  expect({
    forward: forwardPages.flatMap(page => page.edges.map(edge => edge.node.id)),
    backward: backwardPages.flatMap(page =>
      page.edges.map(edge => edge.node.id),
    ),
    totals: [...forwardPages, ...backwardPages].map(page => page.totalCount),
  }).toEqual({
    forward: PAGINATION_CONTRACT_ID_ASCENDING.expected.map(
      label => PAGINATION_CONTRACT_ROWS[label].id,
    ),
    backward: PAGINATION_CONTRACT_ID_ASCENDING.expected
      .slice(0, -1)
      .map(label => PAGINATION_CONTRACT_ROWS[label].id),
    totals: Array(forwardPages.length + backwardPages.length).fill(
      PAGINATION_CONTRACT_ROW_COUNT,
    ),
  });
};

const paginationContractCursorOf = (row: PaginationContractRow) =>
  Buffer.from(
    JSON.stringify({ created_at: row.created_at.toISOString(), id: row.id }),
  ).toString("base64");

const paginationContractRowsOf = (labels: PaginationContractRowLabel[]) =>
  labels.map(label => PAGINATION_CONTRACT_ROWS[label]);

const expectedPaginationContractPage = ({
  labels,
  totalCount,
  hasNextPage,
  hasPreviousPage,
}: {
  labels: PaginationContractRowLabel[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}) => {
  const cursors = paginationContractRowsOf(labels).map(
    paginationContractCursorOf,
  );

  return {
    ids: paginationContractRowsOf(labels).map(row => row.id),
    cursors,
    totalCount,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: cursors[0] ?? null,
      endCursor: cursors[cursors.length - 1] ?? null,
    },
  };
};

const describePaginationContractPage = (page: PaginationContractPage) => ({
  ids: page.edges.map(edge => edge.node.id),
  cursors: page.edges.map(edge => edge.cursor),
  totalCount: page.totalCount,
  pageInfo: {
    hasNextPage: page.pageInfo.hasNextPage,
    hasPreviousPage: page.pageInfo.hasPreviousPage,
    startCursor: page.pageInfo.startCursor,
    endCursor: page.pageInfo.endCursor,
  },
});

export type {
  PaginationContractPage,
  PaginationContractRow,
  PaginationContractRowLabel,
  PaginationContractSorting,
};
export {
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
};
