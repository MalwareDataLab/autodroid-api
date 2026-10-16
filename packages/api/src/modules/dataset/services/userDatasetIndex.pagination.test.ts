import type { TestContext } from "vitest";

// Util import
import { userDatasetRows } from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserDatasetIndexService } from "./userDatasetIndex.service";

const prepareUserDatasetSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const user = await userFactory.create();
  const otherUser = await userFactory.create();
  const userDatasetIndexService = context.container.resolve(
    UserDatasetIndexService,
  );

  return {
    ...userDatasetRows(user, otherUser),
    list: (pagination, sorting) =>
      userDatasetIndexService.execute({ user, pagination, sorting }),
  };
};

describePaginationServiceContract(
  "Service: UserDatasetIndexService",
  prepareUserDatasetSurface,
  {
    outOfScopeDescription: "another user's private datasets",
    unlistedDescription: "another user's dataset turned private",
  },
);
