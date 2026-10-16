import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Target import
import { McpAuthorizationSessionsEndService } from "./mcpAuthorizationSessionsEnd.service";

const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("Service: McpAuthorizationSessionsEndService", () => {
  let incrMock: ReturnType<typeof vi.fn>;
  let expireMock: ReturnType<typeof vi.fn>;
  let updateManyMock: ReturnType<typeof vi.fn>;
  let mcpAuthorizationSessionsEndService: McpAuthorizationSessionsEndService;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    incrMock = vi.fn().mockResolvedValue(1);
    expireMock = vi.fn().mockResolvedValue(1);
    updateManyMock = vi.fn().mockResolvedValue(2);

    mcpAuthorizationSessionsEndService = new McpAuthorizationSessionsEndService(
      {
        connection: { incr: incrMock, expire: expireMock },
      } as unknown as IInMemoryDatabaseProvider,
      {
        updateMany: updateManyMock,
      } as unknown as IMcpAuthorizationGrantRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should move the user's sessions epoch on, keep it long enough to outlive any code, and revoke every active grant", async () => {
    await mcpAuthorizationSessionsEndService.execute({ user_id: "user-1" });

    expect(incrMock).toHaveBeenCalledExactlyOnceWith(
      "mcp-oauth:sessions-epoch:user-1",
    );
    expect(expireMock).toHaveBeenCalledExactlyOnceWith(
      "mcp-oauth:sessions-epoch:user-1",
      86400,
    );
    expect(updateManyMock).toHaveBeenCalledExactlyOnceWith(
      { user_id: "user-1", active: true },
      { revoked_at: NOW },
    );
  });

  it("should move the epoch before it revokes the grants", async () => {
    await mcpAuthorizationSessionsEndService.execute({ user_id: "user-1" });

    expect(incrMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateManyMock.mock.invocationCallOrder[0],
    );
  });

  it("should fail when the grants cannot be revoked", async () => {
    updateManyMock.mockRejectedValueOnce(new Error("database is down"));

    await expect(
      mcpAuthorizationSessionsEndService.execute({ user_id: "user-1" }),
    ).rejects.toThrowError("database is down");
  });
});
