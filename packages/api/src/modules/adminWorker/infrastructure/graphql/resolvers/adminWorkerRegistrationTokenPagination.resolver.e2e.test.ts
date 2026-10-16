import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminWorkerRegistrationTokenRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminWorkerRegistrationTokensQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();

  return {
    ...adminWorkerRegistrationTokenRows(owner),
    request: requestGraphqlPage(context, {
      authorize: "admin",
      field: "adminWorkerRegistrationTokens",
      filter: { archived: { type: "Boolean", value: false } },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminWorkerRegistrationTokenResolver adminWorkerRegistrationTokens",
  prepareAdminWorkerRegistrationTokensQuerySurface,
  {
    outOfScopeDescription:
      "archived registration tokens under a not-archived filter",
  },
);
