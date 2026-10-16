import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from "vitest";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { UserMcpAuthorizationGrantRevokeService } from "./userMcpAuthorizationGrantRevoke.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const NOT_FOUND = expect.objectContaining({
  key: "@user_mcp_authorization_grant_revoke_service/GRANT_NOT_FOUND",
  message: "Connection not found.",
  statusCode: 404,
});

describe("Service: UserMcpAuthorizationGrantRevokeService", () => {
  let updateOneMock: ReturnType<typeof vi.fn>;
  let service: UserMcpAuthorizationGrantRevokeService;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });

    updateOneMock = vi.fn();

    service = new UserMcpAuthorizationGrantRevokeService({
      updateOne: updateOneMock,
    } as unknown as Mocked<IMcpAuthorizationGrantRepository>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set revoked_at on the owner's active grant and return the revoked grant", async () => {
    const revoked = { id: "grant-1", revoked_at: NOW };
    updateOneMock.mockResolvedValueOnce(revoked);

    const result = await service.execute({
      user_id: "user-1",
      grant_id: "grant-1",
      language: "en",
    });

    expect(updateOneMock).toHaveBeenCalledWith(
      { id: "grant-1", user_id: "user-1", active: true },
      { revoked_at: NOW },
    );
    expect(result).toBe(revoked);
  });

  it("should throw a 404 when no active grant of this user has that id — missing, expired, already revoked, or another user's", async () => {
    updateOneMock.mockResolvedValueOnce(null);

    await expect(
      service.execute({
        user_id: "user-1",
        grant_id: "grant-1",
        language: "en",
      }),
    ).rejects.toThrowError(NOT_FOUND);
  });
});
