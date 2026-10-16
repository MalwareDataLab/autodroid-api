import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { userDatasetRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserDatasetsQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();

  return {
    ...userDatasetRows(user, otherUser),
    request: requestGraphqlPage(context, {
      authorize: "user",
      field: "userDatasets",
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserDatasetResolver userDatasets",
  prepareUserDatasetsQuerySurface,
  { outOfScopeDescription: "another user's private datasets" },
);
