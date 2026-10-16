import { describe, expect, it } from "vitest";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";
import { Processing } from "@modules/processing/entities/processing.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { processingFactory } from "@modules/processing/entities/factories/processing.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Target import
import { withVisibleProcessingOwners } from "./withVisibleProcessingOwners.util";

describe("Utils: withVisibleProcessingOwners", () => {
  const user = userFactory.build();
  const otherUser = userFactory.build();
  const userSession = { user, is_admin: false } as Session;

  it("should keep only the owners the signed-in user is, on a copy that leaves the given processing untouched", () => {
    const otherUserDataset = datasetFactory.build(
      {},
      { associations: { user: otherUser } },
    );
    const processing = processingFactory.build(
      {},
      { associations: { user, dataset: otherUserDataset } },
    );

    const result = withVisibleProcessingOwners(processing, userSession);

    expect(result).toBeInstanceOf(Processing);
    expect(result.dataset).toBeInstanceOf(Dataset);
    expect(result).toEqual({
      ...processing,
      user,
      dataset: { ...otherUserDataset, user: null },
    });
    expect(processing.dataset.user).toBe(otherUser);
  });

  it("should hide both owners of another user's processing of their own dataset", () => {
    const otherUserDataset = datasetFactory.build(
      {},
      { associations: { user: otherUser } },
    );
    const processing = processingFactory.build(
      {},
      { associations: { user: otherUser, dataset: otherUserDataset } },
    );

    const result = withVisibleProcessingOwners(processing, userSession);

    expect(result).toEqual({
      ...processing,
      user: null,
      dataset: { ...otherUserDataset, user: null },
    });
    expect(processing.user).toBe(otherUser);
  });

  it("should hide both owners when there is no signed-in user", () => {
    const otherUserDataset = datasetFactory.build(
      {},
      { associations: { user: otherUser } },
    );
    const processing = processingFactory.build(
      {},
      { associations: { user: otherUser, dataset: otherUserDataset } },
    );

    const result = withVisibleProcessingOwners(processing, undefined);

    expect(result).toEqual({
      ...processing,
      user: null,
      dataset: { ...otherUserDataset, user: null },
    });
  });
});
