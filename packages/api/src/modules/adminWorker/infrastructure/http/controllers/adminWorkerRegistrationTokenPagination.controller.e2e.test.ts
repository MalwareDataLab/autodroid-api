import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminWorkerRegistrationTokenRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminWorkerRegistrationTokenRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();

  return {
    ...adminWorkerRegistrationTokenRows(owner),
    request: requestRestPage(context, {
      authorize: "admin",
      path: "/admin/worker/registration-token",
      filter: { archived: "false" },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminWorkerRegistrationTokenController GET /admin/worker/registration-token",
  prepareAdminWorkerRegistrationTokenRouteSurface,
  {
    outOfScopeDescription:
      "archived registration tokens under a not-archived filter",
  },
);
