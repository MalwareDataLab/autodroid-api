import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminDatasetRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminDatasetRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();

  return {
    ...adminDatasetRows(owner, otherOwner),
    request: requestRestPage(context, {
      authorize: "admin",
      path: "/admin/dataset",
      filter: { user_id: owner.id },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminDatasetController GET /admin/dataset",
  prepareAdminDatasetRouteSurface,
  { outOfScopeDescription: "another owner's datasets under an owner filter" },
);
