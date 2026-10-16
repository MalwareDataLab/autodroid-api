import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it } from "vitest";

// Configuration import
import { getAdminConfig } from "@config/admin";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { workerFactory } from "@modules/worker/entities/factories/worker.factory";

// Target import
import { AdminWorkerUpdateService } from "./adminWorkerUpdate.service";

describe("Service: AdminWorkerUpdateService", () => {
  let adminWorkerUpdateService: AdminWorkerUpdateService;

  beforeEach(context => {
    adminWorkerUpdateService = context.container.resolve(
      AdminWorkerUpdateService,
    );
  });

  it("should update a worker with valid tags", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    const response = await adminWorkerUpdateService.execute({
      worker_id: worker.id,
      data: { description: "Updated", tags: "one,two,three" },
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({
      id: worker.id,
      description: "Updated",
      tags: "one,two,three",
    });
  });

  it("should update a worker without tags", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    const response = await adminWorkerUpdateService.execute({
      worker_id: worker.id,
      data: { description: "Updated" },
      user: admin,
      language: "en",
    });

    expect(response).toMatchObject({
      id: worker.id,
      description: "Updated",
    });
  });

  it("should clear the description and tags when they are null", async context => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create({
      description: "Before",
      tags: "one,two",
    });

    const response = await adminWorkerUpdateService.execute({
      worker_id: worker.id,
      data: { description: null, tags: null },
      user: admin,
      language: "en",
    });

    const stored = await context.repositories.WorkerRepository.findOne({
      id: worker.id,
    });
    expect(response).toMatchObject({
      id: worker.id,
      description: null,
      tags: null,
    });
    expect(stored).toMatchObject({
      id: worker.id,
      description: null,
      tags: null,
    });
  });

  it("should throw if the worker was not found", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });

    await expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: faker.string.uuid(),
        data: { description: "Updated" },
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_update_service/WORKER_NOT_FOUND",
      }),
    );
  });

  it("should throw if the tags are invalid", async () => {
    const admin = await userFactory.create({
      email: getAdminConfig().emails[0],
    });
    const worker = await workerFactory.create();

    await expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: worker.id,
        data: { tags: "one,two,three," },
        user: admin,
        language: "en",
      }),
    ).rejects.toThrowError(
      expect.objectContaining({
        key: "@admin_worker_update_service/TAGS_NOT_PROVIDED",
      }),
    );
  });

  it("should throw if the user is not an admin", async () => {
    const user = await userFactory.create();

    expect(() =>
      adminWorkerUpdateService.execute({
        worker_id: faker.string.uuid(),
        data: { description: "Updated" },
        user,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
