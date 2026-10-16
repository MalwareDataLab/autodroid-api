import type { TestContext } from "vitest";

// Util import
import { prepareUserProcessingRows } from "@/test/utils/paginationContractSeed.util";
import {
  PaginationServiceContractSurface,
  describePaginationServiceContract,
} from "@/test/utils/paginationServiceContract.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Service import
import { UserProcessingIndexService } from "./userProcessingIndex.service";

const prepareUserProcessingSurface = async (
  context: TestContext,
): Promise<PaginationServiceContractSurface> => {
  const user = await userFactory.create();
  const otherUser = await userFactory.create();
  const { listedDataset, ...rows } = await prepareUserProcessingRows(
    user,
    otherUser,
  );
  const userProcessingIndexService = context.container.resolve(
    UserProcessingIndexService,
  );

  return {
    ...rows,
    list: (pagination, sorting) =>
      userProcessingIndexService.execute({
        user,
        params: {},
        pagination,
        sorting,
        language: "en",
      }),
    listInScope: (pagination, sorting) =>
      userProcessingIndexService.execute({
        user,
        params: { dataset_id: listedDataset.id },
        pagination,
        sorting,
        language: "en",
      }),
  };
};

describePaginationServiceContract(
  "Service: UserProcessingIndexService",
  prepareUserProcessingSurface,
  {
    outOfScopeDescription:
      "another user's private, archived and other-dataset processes under a dataset filter",
    unlistedDescription: "a process its owner deleted, which archives it",
  },
);
