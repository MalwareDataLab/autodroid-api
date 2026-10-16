import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { prepareAdminProcessingRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminProcessingRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();

  return {
    ...(await prepareAdminProcessingRows(owner, otherOwner)),
    request: requestRestPage(context, {
      authorize: "admin",
      path: "/admin/processing",
      filter: { user_id: owner.id },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminProcessingController GET /admin/processing",
  prepareAdminProcessingRouteSurface,
  {
    outOfScopeDescription:
      "another owner's and archived processes under an owner filter",
  },
);
