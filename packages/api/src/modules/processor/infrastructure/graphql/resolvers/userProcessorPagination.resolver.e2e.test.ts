import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestGraphqlPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { userProcessorRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserProcessorsQuerySurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();

  return {
    ...userProcessorRows(user, otherUser),
    request: requestGraphqlPage(context, {
      authorize: "user",
      field: "userProcessors",
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserProcessorResolver userProcessors",
  prepareUserProcessorsQuerySurface,
  { outOfScopeDescription: "another user's hidden processors" },
);
