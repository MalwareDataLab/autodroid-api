import type { TestContext } from "vitest";

// Util import
import {
  adminProcessorRows,
  createPaginationContractAdmin,
} from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { AdminProcessorIndexService } from "./adminProcessorIndex.service";

const prepareAdminProcessorSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const admin = await createPaginationContractAdmin();
  const owners = await Promise.all([
    userFactory.create(),
    userFactory.create(),
  ]);
  const adminProcessorIndexService = context.container.resolve(
    AdminProcessorIndexService,
  );

  return {
    ...adminProcessorRows(owners),
    list: (pagination, sorting) =>
      adminProcessorIndexService.execute({
        user: admin,
        pagination,
        sorting,
        language: "en",
      }),
  };
};

describePaginationServiceContract(
  "Service: AdminProcessorIndexService",
  prepareAdminProcessorSurface,
);
