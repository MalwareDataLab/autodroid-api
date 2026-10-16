import type { TestContext } from "vitest";

// Util import
import {
  adminWorkerRows,
  createPaginationContractAdmin,
} from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminWorkerIndexService } from "./adminWorkerIndex.service";

const prepareAdminWorkerSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const admin = await createPaginationContractAdmin();
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);
  const adminWorkerIndexService = context.container.resolve(
    AdminWorkerIndexService,
  );

  return {
    ...adminWorkerRows(owners),
    list: (pagination, sorting) =>
      adminWorkerIndexService.execute({
        user: admin,
        filter: {},
        pagination,
        sorting,
        language: "en",
      }),
    listInScope: (pagination, sorting) =>
      adminWorkerIndexService.execute({
        user: admin,
        filter: { archived: false },
        pagination,
        sorting,
        language: "en",
      }),
  };
};

describePaginationServiceContract(
  "Service: AdminWorkerIndexService",
  prepareAdminWorkerSurface,
  { outOfScopeDescription: "archived workers under a not-archived filter" },
);
