import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { prepareUserProcessingRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserProcessingRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();
  const { listedDataset, ...rows } = await prepareUserProcessingRows(
    user,
    otherUser,
  );

  return {
    ...rows,
    request: requestRestPage(context, {
      authorize: "user",
      path: "/processing",
      filter: { dataset_id: listedDataset.id },
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserProcessingController GET /processing",
  prepareUserProcessingRouteSurface,
  {
    outOfScopeDescription:
      "another user's private, archived and other-dataset processes under a dataset filter",
  },
);
