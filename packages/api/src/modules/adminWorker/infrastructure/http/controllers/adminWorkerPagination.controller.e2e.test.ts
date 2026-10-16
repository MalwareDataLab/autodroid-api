import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminWorkerRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminWorkerRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);

  return {
    ...adminWorkerRows(owners),
    request: requestRestPage(context, {
      authorize: "admin",
      path: "/admin/worker",
      filter: { archived: "false" },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminWorkerController GET /admin/worker",
  prepareAdminWorkerRouteSurface,
  { outOfScopeDescription: "archived workers under a not-archived filter" },
);
