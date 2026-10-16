import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminProcessorRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminProcessorRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);

  return {
    ...adminProcessorRows(owners),
    request: requestRestPage(context, {
      authorize: "admin",
      path: "/admin/processor",
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminProcessorController GET /admin/processor",
  prepareAdminProcessorRouteSurface,
);
