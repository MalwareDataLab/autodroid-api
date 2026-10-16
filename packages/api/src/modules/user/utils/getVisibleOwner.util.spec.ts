import { describe, expect, it } from "vitest";

// DTO import
import { Session } from "@modules/user/types/IUserSession.dto";

// Factory import
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Target import
import { getVisibleOwner } from "./getVisibleOwner.util";

describe("Utils: getVisibleOwner", () => {
  const owner = userFactory.build();
  const dataset = datasetFactory.build({}, { associations: { user: owner } });

  it("should return the owner to the owner", () => {
    const userSession = { user: owner, is_admin: false } as Session;

    const result = getVisibleOwner(dataset, userSession);

    expect(result).toBe(owner);
  });

  it("should return the owner to an admin who does not own the entity", () => {
    const userSession = {
      user: userFactory.build(),
      is_admin: true,
    } as Session;

    const result = getVisibleOwner(dataset, userSession);

    expect(result).toBe(owner);
  });

  it("should hide the owner from a user who neither owns the entity nor is an admin", () => {
    const userSession = {
      user: userFactory.build(),
      is_admin: false,
    } as Session;

    const result = getVisibleOwner(dataset, userSession);

    expect(result).toBeNull();
  });

  it("should hide the owner when no user is signed in, as on a worker request", () => {
    const result = getVisibleOwner(dataset, undefined);

    expect(result).toBeNull();
  });
});
