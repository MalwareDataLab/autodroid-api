import type { TestContext } from "vitest";

// Util import
import { userProcessorRows } from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserProcessorIndexService } from "./userProcessorIndex.service";

const prepareUserProcessorSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const user = await userFactory.create();
  const otherUser = await userFactory.create();
  const userProcessorIndexService = context.container.resolve(
    UserProcessorIndexService,
  );

  return {
    ...userProcessorRows(user, otherUser),
    list: (pagination, sorting) =>
      userProcessorIndexService.execute({ user, pagination, sorting }),
  };
};

describePaginationServiceContract(
  "Service: UserProcessorIndexService",
  prepareUserProcessorSurface,
  {
    outOfScopeDescription: "another user's hidden processors",
    unlistedDescription: "another user's processor turned hidden",
  },
);
