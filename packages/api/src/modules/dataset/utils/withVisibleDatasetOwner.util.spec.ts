import { describe, expect, it } from "vitest";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Entity import
import { Dataset } from "@modules/dataset/entities/dataset.entity";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Target import
import { withVisibleDatasetOwner } from "./withVisibleDatasetOwner.util";

describe("Utils: withVisibleDatasetOwner", () => {
  const owner = userFactory.build();

  it("should keep the owner on a dataset the signed-in user owns", () => {
    const dataset = datasetFactory.build({}, { associations: { user: owner } });

    const result = withVisibleDatasetOwner(dataset, {
      user: owner,
      is_admin: false,
    } as Session);

    expect(result).toBeInstanceOf(Dataset);
    expect(result).toEqual(dataset);
  });

  it("should return a copy without the owner of another user's dataset, leaving the given dataset untouched", () => {
    const dataset = datasetFactory.build({}, { associations: { user: owner } });

    const result = withVisibleDatasetOwner(dataset, {
      user: userFactory.build(),
      is_admin: false,
    } as Session);

    expect(result).toBeInstanceOf(Dataset);
    expect(result).toEqual({ ...dataset, user: null });
    expect(result.user_id).toBe(owner.id);
    expect(dataset.user).toBe(owner);
  });
});
