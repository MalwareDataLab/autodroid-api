import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminProcessorRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminProcessorsQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);

  return {
    ...adminProcessorRows(owners),
    request: requestGraphqlPage(context, {
      authorize: "admin",
      field: "adminProcessors",
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminProcessorResolver adminProcessors",
  prepareAdminProcessorsQuerySurface,
);
