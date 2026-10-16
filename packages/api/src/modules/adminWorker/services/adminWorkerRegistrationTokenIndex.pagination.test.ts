import type { TestContext } from "vitest";

// Util import
import {
  adminWorkerRegistrationTokenRows,
  createPaginationContractAdmin,
} from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminWorkerRegistrationTokenIndexService } from "./adminWorkerRegistrationTokenIndex.service";

const prepareAdminWorkerRegistrationTokenSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const admin = await createPaginationContractAdmin();
  const owner = await userFactory.create();
  const adminWorkerRegistrationTokenIndexService = context.container.resolve(
    AdminWorkerRegistrationTokenIndexService,
  );

  return {
    ...adminWorkerRegistrationTokenRows(owner),
    list: (pagination, sorting) =>
      adminWorkerRegistrationTokenIndexService.execute({
        user: admin,
        filter: {},
        pagination,
        sorting,
        language: "en",
      }),
    listInScope: (pagination, sorting) =>
      adminWorkerRegistrationTokenIndexService.execute({
        user: admin,
        filter: { archived: false },
        pagination,
        sorting,
        language: "en",
      }),
  };
};

describePaginationServiceContract(
  "Service: AdminWorkerRegistrationTokenIndexService",
  prepareAdminWorkerRegistrationTokenSurface,
  {
    outOfScopeDescription:
      "archived registration tokens under a not-archived filter",
  },
);
