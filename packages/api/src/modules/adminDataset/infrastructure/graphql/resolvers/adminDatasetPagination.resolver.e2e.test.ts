import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { adminDatasetRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareAdminDatasetsQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();

  return {
    ...adminDatasetRows(owner, otherOwner),
    request: requestGraphqlPage(context, {
      authorize: "admin",
      field: "adminDatasets",
      filter: { user_id: { type: "String", value: owner.id } },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: AdminDatasetResolver adminDatasets",
  prepareAdminDatasetsQuerySurface,
  { outOfScopeDescription: "another owner's datasets under an owner filter" },
);
