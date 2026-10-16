import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminWorkerRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminWorkersQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);

  return {
    ...adminWorkerRows(owners),
    request: requestGraphqlPage(context, {
      authorize: "admin",
      field: "adminWorkers",
      filter: { archived: { type: "Boolean", value: false } },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminWorkerResolver adminWorkers",
  prepareAdminWorkersQuerySurface,
  { outOfScopeDescription: "archived workers under a not-archived filter" },
);
