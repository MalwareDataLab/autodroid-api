import { beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Factory import
import { userFactory } from "@modules/user/entities/factories/user.factory";

// Context import
import { GraphQLContext } from "@shared/infrastructure/graphql/context";

// Service import
import { AdminFileRemoveAllDanglingService } from "@modules/adminFile/services/adminFileRemoveAllDangling.service";

// Target import
import { AdminFileResolver } from "./adminFile.resolver";

describe("Resolver: AdminFileResolver", () => {
  const user = userFactory.build();

  const graphQLContext = {
    user_session: { user },
    language: "en",
  } as GraphQLContext;

  let adminFileRemoveAllDanglingService: { execute: ReturnType<typeof vi.fn> };

  let adminFileResolver: AdminFileResolver;

  beforeEach(() => {
    adminFileRemoveAllDanglingService = { execute: vi.fn() };

    vi.spyOn(container, "resolve").mockImplementation((token: any): any => {
      if (token === AdminFileRemoveAllDanglingService)
        return adminFileRemoveAllDanglingService;
      throw new Error(`Unexpected token: ${String(token)}`);
    });

    adminFileResolver = new AdminFileResolver();
  });

  it("should return the amount of dangling files removed", async () => {
    adminFileRemoveAllDanglingService.execute.mockResolvedValueOnce(7);

    const result =
      await adminFileResolver.adminFileRemoveAllDangling(graphQLContext);

    expect(adminFileRemoveAllDanglingService.execute).toHaveBeenCalledWith({
      user,
      language: "en",
    });
    expect(result).toBe(7);
  });

  it("should propagate a failure removing the dangling files", async () => {
    const error = new Error("remove failed");
    adminFileRemoveAllDanglingService.execute.mockRejectedValueOnce(error);

    await expect(
      adminFileResolver.adminFileRemoveAllDangling(graphQLContext),
    ).rejects.toThrowError(error);
  });
});
