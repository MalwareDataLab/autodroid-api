import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { userProcessorRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserProcessorRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();

  return {
    ...userProcessorRows(user, otherUser),
    request: requestRestPage(context, {
      authorize: "user",
      path: "/processor",
    }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserProcessorController GET /processor",
  prepareUserProcessorRouteSurface,
  { outOfScopeDescription: "another user's hidden processors" },
);
