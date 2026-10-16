import type { TestContext } from "vitest";

// Util import
import {
  adminDatasetRows,
  createPaginationContractAdmin,
} from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminDatasetIndexService } from "./adminDatasetIndex.service";

const prepareAdminDatasetSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const admin = await createPaginationContractAdmin();
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();
  const adminDatasetIndexService = context.container.resolve(
    AdminDatasetIndexService,
  );

  return {
    ...adminDatasetRows(owner, otherOwner),
    list: (pagination, sorting) =>
      adminDatasetIndexService.execute({
        user: admin,
        filter: {},
        pagination,
        sorting,
      }),
    listInScope: (pagination, sorting) =>
      adminDatasetIndexService.execute({
        user: admin,
        filter: { user_id: owner.id },
        pagination,
        sorting,
      }),
  };
};

describePaginationServiceContract(
  "Service: AdminDatasetIndexService",
  prepareAdminDatasetSurface,
  { outOfScopeDescription: "another owner's datasets under an owner filter" },
);
