import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { container } from "tsyringe";

// Provider import
import { IUserAgentInfoProvider } from "@shared/container/providers/UserAgentInfoProvider/models/IUserAgentInfo.provider";

// Middleware import
import { userAgentMiddleware } from "./userAgent.middleware";

const buildProviderMock = () => ({
  lookup: vi.fn(async () => ({ resolved: true })),
});

let providerMock: ReturnType<typeof buildProviderMock>;

const buildRequest = (overrides: any = {}): any => ({
  useragent: {
    isMobile: false,
    isDesktop: true,
    browser: "Chrome",
    version: "120",
    os: "macOS",
    platform: "Apple Mac",
  },
  headers: {},
  socket: {},
  ip: "9.9.9.9",
  get: vi.fn((header: string) =>
    header === "host" ? "example.com" : "https://origin.example",
  ),
  ...overrides,
});

describe("Middleware: userAgentMiddleware", () => {
  beforeEach(() => {
    providerMock = buildProviderMock();
    container.registerInstance(
      "UserAgentInfoProvider",
      providerMock as unknown as IUserAgentInfoProvider,
    );
  });

  afterEach(() => {
    container.clearInstances();
    vi.clearAllMocks();
  });

  it("should skip the lookup and call next when there is no user agent", async () => {
    const next = vi.fn();
    const req = buildRequest({ useragent: undefined });

    await userAgentMiddleware(req, {} as any, next);

    expect(providerMock.lookup).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should resolve the forwarded ip from a string x-forwarded-for header", async () => {
    const next = vi.fn();
    const req = buildRequest({
      headers: { "x-forwarded-for": "5.5.5.5" },
    });

    await userAgentMiddleware(req, {} as any, next);

    expect(providerMock.lookup).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "5.5.5.5" }),
    );
    expect(req.agent_info).toEqual({ resolved: true });
    expect(next).toHaveBeenCalledOnce();
  });

  it("should resolve the forwarded ip from the first entry of an array header", async () => {
    const req = buildRequest({
      headers: { "x-forwarded-for": ["7.7.7.7", "8.8.8.8"] },
    });

    await userAgentMiddleware(req, {} as any, vi.fn());

    expect(providerMock.lookup).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "7.7.7.7" }),
    );
  });

  it("should fall back to the socket remote address when no forwarded header is present", async () => {
    const req = buildRequest({
      headers: {},
      socket: { remoteAddress: "3.3.3.3" },
    });

    await userAgentMiddleware(req, {} as any, vi.fn());

    expect(providerMock.lookup).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "3.3.3.3" }),
    );
  });

  it("should fall back to the request ip when no forwarded header nor socket address are present", async () => {
    const req = buildRequest({ headers: {}, socket: {} });

    await userAgentMiddleware(req, {} as any, vi.fn());

    expect(providerMock.lookup).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "9.9.9.9" }),
    );
  });
});
