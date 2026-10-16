import type { TestContext } from "vitest";

// Util import
import {
  createPaginationContractAdmin,
  prepareAdminProcessingRows,
} from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminProcessingIndexService } from "./adminProcessingIndex.service";

const prepareAdminProcessingSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const admin = await createPaginationContractAdmin();
  const owner = await userFactory.create();
  const otherOwner = await userFactory.create();
  const adminProcessingIndexService = context.container.resolve(
    AdminProcessingIndexService,
  );

  return {
    ...(await prepareAdminProcessingRows(owner, otherOwner)),
    list: (pagination, sorting) =>
      adminProcessingIndexService.execute({
        user: admin,
        filter: {},
        pagination,
        sorting,
      }),
    listInScope: (pagination, sorting) =>
      adminProcessingIndexService.execute({
        user: admin,
        filter: { user_id: owner.id },
        pagination,
        sorting,
      }),
  };
};

describePaginationServiceContract(
  "Service: AdminProcessingIndexService",
  prepareAdminProcessingSurface,
  {
    outOfScopeDescription:
      "another owner's and archived processes under an owner filter",
    unlistedDescription: "a deleted process, which is archived",
  },
);
