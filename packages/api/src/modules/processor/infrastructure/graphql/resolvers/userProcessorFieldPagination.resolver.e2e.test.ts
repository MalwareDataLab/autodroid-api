import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { prepareUserProcessingRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserProcessorProcessesFieldSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();
  const { listedDataset, processor, ...rows } = await prepareUserProcessingRows(
    user,
    otherUser,
  );

  return {
    ...rows,
    request: requestGraphqlPage(context, {
      authorize: "user",
      field: "processes",
      parent: {
        field: "userProcessor",
        argument: "processor_id",
        id: processor.id,
      },
      filter: { dataset_id: { type: "String", value: listedDataset.id } },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserProcessorFieldResolver processes",
  prepareUserProcessorProcessesFieldSurface,
  {
    outOfScopeDescription:
      "another user's private, archived and other-dataset processes under a dataset filter",
  },
);
