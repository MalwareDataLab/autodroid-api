import { beforeEach, describe, expect, it, vi } from "vitest";

// Configuration import
import { getEnvConfig } from "@config/env";

const { PrismaClientMock, prismaInstanceMock } = vi.hoisted(() => {
  const instance = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $on: vi.fn(),
  };
  return {
    PrismaClientMock: vi.fn(() => instance),
    prismaInstanceMock: instance,
  };
});

vi.mock("@prisma/client", () => ({ PrismaClient: PrismaClientMock }));

vi.mock("@config/env", () => ({ getEnvConfig: vi.fn() }));

describe("Provider: PrismaDatabaseProvider", () => {
  const envMock = vi.mocked(getEnvConfig);

  const loadProvider = async () => {
    vi.resetModules();
    const providerModule = await import("./prismaDatabase.provider");
    return providerModule.PrismaDatabaseProvider;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    envMock.mockReturnValue({
      isTestEnv: true,
      DATABASE_LOGGER_ENABLED: "false",
    } as any);

    prismaInstanceMock.$connect.mockResolvedValue(undefined);
  });

  it("should build a silent prisma client and connect when logging is disabled", async () => {
    const PrismaDatabaseProvider = await loadProvider();

    const provider = new PrismaDatabaseProvider();
    await provider.initialization;

    expect(PrismaClientMock).toHaveBeenCalledWith({ log: [] });
    expect(prismaInstanceMock.$connect).toHaveBeenCalledOnce();
    expect(provider.client).toBe(prismaInstanceMock);
  });

  it("should build a verbose prisma client when logging is enabled", async () => {
    envMock.mockReturnValue({
      isTestEnv: true,
      DATABASE_LOGGER_ENABLED: "true",
    } as any);

    const PrismaDatabaseProvider = await loadProvider();

    const provider = new PrismaDatabaseProvider();
    await provider.initialization;

    expect(PrismaClientMock).toHaveBeenCalledWith({
      log: ["query", "info", "warn", "error"],
    });
  });

  it("should reuse the provided prisma client instead of constructing one", async () => {
    const PrismaDatabaseProvider = await loadProvider();

    const provider = new PrismaDatabaseProvider(prismaInstanceMock as any);
    await provider.initialization;

    expect(PrismaClientMock).not.toHaveBeenCalled();
    expect(prismaInstanceMock.$connect).toHaveBeenCalledOnce();
    expect(provider.client).toBe(prismaInstanceMock);
  });
});
