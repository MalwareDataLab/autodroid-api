import type { TestContext } from "vitest";

// Util import
import {
  PaginationBoundaryContractSurface,
  describePaginationBoundaryContract,
  requestRestPage,
} from "@/test/utils/paginationBoundaryContract.util";
import { userDatasetRows } from "@/test/utils/paginationContractSeed.util";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

const prepareUserDatasetRouteSurface = async (
  context: TestContext,
): Promise<PaginationBoundaryContractSurface> => {
  const user = await userFactory.create({ email: context.userSession.email });
  const otherUser = await userFactory.create();

  return {
    ...userDatasetRows(user, otherUser),
    request: requestRestPage(context, { authorize: "user", path: "/dataset" }),
  };
};

describePaginationBoundaryContract(
  "E2E: UserDatasetController GET /dataset",
  prepareUserDatasetRouteSurface,
  { outOfScopeDescription: "another user's private datasets" },
);
