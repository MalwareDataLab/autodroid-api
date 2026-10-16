import { beforeEach, describe, expect, it, Mocked, vi } from "vitest";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { UserMcpAuthorizationGrantIndexService } from "./userMcpAuthorizationGrantIndex.service";

describe("Service: UserMcpAuthorizationGrantIndexService", () => {
  let findManyMock: ReturnType<typeof vi.fn>;
  let service: UserMcpAuthorizationGrantIndexService;

  beforeEach(() => {
    findManyMock = vi.fn().mockResolvedValue([]);

    service = new UserMcpAuthorizationGrantIndexService({
      findMany: findManyMock,
    } as unknown as Mocked<IMcpAuthorizationGrantRepository>);
  });

  it("should ask for only this user's active grants and return them as listed", async () => {
    const grants = [{ id: "newer" }, { id: "older" }];
    findManyMock.mockResolvedValueOnce(grants);

    const result = await service.execute({ user_id: "user-1" });

    expect(findManyMock).toHaveBeenCalledWith({
      user_id: "user-1",
      active: true,
    });
    expect(result).toBe(grants);
  });

  it("should return an empty list when the user has no active grant", async () => {
    await expect(service.execute({ user_id: "user-1" })).resolves.toEqual([]);
  });

  it("should propagate a database failure instead of answering with an empty list", async () => {
    findManyMock.mockRejectedValueOnce(new Error("database is down"));

    await expect(service.execute({ user_id: "user-1" })).rejects.toThrowError(
      "database is down",
    );
  });
});
