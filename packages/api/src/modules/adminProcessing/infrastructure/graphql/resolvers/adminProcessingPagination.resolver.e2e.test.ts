import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { prepareAdminProcessingRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminProcessesQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();

  return {
    ...(await prepareAdminProcessingRows(owner, otherOwner)),
    request: requestGraphqlPage(context, {
      authorize: "admin",
      field: "adminProcesses",
      filter: { user_id: { type: "String", value: owner.id } },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminProcessingResolver adminProcesses",
  prepareAdminProcessesQuerySurface,
  {
    outOfScopeDescription:
      "another owner's and archived processes under an owner filter",
  },
);
