import { beforeEach, describe, expect, it } from "vitest";
import { container } from "tsyringe";

// Factory import
import { User } from "@modules/user/entities/user.entity";
import { userFactory } from "@modules/user/entities/factories/user.factory";
import { fileFactory } from "@modules/file/entities/factories/file.factory";

// Enum import
import { FILE_PROVIDER_STATUS } from "@modules/file/types/fileProviderStatus.enum";

// Service import
import { AdminFileRemoveAllDanglingService } from "./adminFileRemoveAllDangling.service";

describe("Service: AdminFileRemoveAllDanglingService", () => {
  let adminUser: User;
  let adminFileRemoveAllDanglingService: AdminFileRemoveAllDanglingService;

  beforeEach(async () => {
    adminUser = await userFactory.create({ email: "luiz@laviola.dev" });
    adminFileRemoveAllDanglingService = container.resolve(
      AdminFileRemoveAllDanglingService,
    );
  });

  it("should remove dangling (not found) files and return the removed count", async () => {
    await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
    });
    await fileFactory.create({
      provider_status: FILE_PROVIDER_STATUS.NOT_FOUND,
    });
    await fileFactory.create({ provider_status: FILE_PROVIDER_STATUS.READY });

    const response = await adminFileRemoveAllDanglingService.execute({
      user: adminUser,
      language: "en",
    });

    expect(response).toBe(2);
  });

  it("should return 0 when there are no dangling files", async () => {
    await fileFactory.create({ provider_status: FILE_PROVIDER_STATUS.READY });

    const response = await adminFileRemoveAllDanglingService.execute({
      user: adminUser,
      language: "en",
    });

    expect(response).toBe(0);
  });

  it("should throw if the user is not an admin", async () => {
    const nonAdmin = await userFactory.create();

    expect(() =>
      adminFileRemoveAllDanglingService.execute({
        user: nonAdmin,
        language: "en",
      }),
    ).toThrowError(
      expect.objectContaining({
        key: "@require_admin_permission/FORBIDDEN",
      }),
    );
  });
});
