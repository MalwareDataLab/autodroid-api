import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { datasetFactory } from "@modules/dataset/entities/factories/dataset.factory";

// Service import
import { AdminDatasetIndexService } from "./adminDatasetIndex.service";

describe("Service: AdminDatasetIndexService", () => {
  let adminUser: User;
  let adminDatasetIndexService: AdminDatasetIndexService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminDatasetIndexService = container.resolve(AdminDatasetIndexService);
  });

  it("should list datasets", async () => {
    const owner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });

    const response = await adminDatasetIndexService.execute({
      filter: {},
      user: adminUser,
    });

    expect(response).toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining(dataset),
          }),
        ]),
      }),
    );
  });

  it("should filter datasets by user_id", async () => {
    const owner = await userFactory.create();
    const otherOwner = await userFactory.create();
    const dataset = await datasetFactory.create({ user_id: owner.id });
    await datasetFactory.create({ user_id: otherOwner.id });

    const response = await adminDatasetIndexService.execute({
      filter: { user_id: owner.id },
      user: adminUser,
    });

    expect(response.edges).toHaveLength(1);
    expect(response.edges[0].node).toMatchObject(dataset);
  });

  it("should return an empty list when nothing matches", async () => {
    const response = await adminDatasetIndexService.execute({
      filter: {},
      user: adminUser,
    });

    expect(response.edges).toEqual([]);
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminDatasetIndexService.execute({
        filter: {},
        user: nonAdmin,
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
