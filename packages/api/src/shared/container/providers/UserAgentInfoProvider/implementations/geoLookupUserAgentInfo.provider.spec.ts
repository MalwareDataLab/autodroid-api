import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { faker } from "@faker-js/faker";

import geo from "geoip-lite";

// DTO import
import { IAgentInfoDTO } from "../types/IAgentInfo.dto";
import { Lookup } from "../types/IParsedUserAgentInfo.dto";

// Provider import
import { GeoLookupUserAgentInfoProvider } from "./geoLookupUserAgentInfo.provider";

vi.mock("geoip-lite", () => ({ default: { lookup: vi.fn() } }));

const lookupMock = geo.lookup as Mock;

describe("Provider: GeoLookupUserAgentInfoProvider", () => {
  let provider: GeoLookupUserAgentInfoProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeoLookupUserAgentInfoProvider();
  });

  it("should resolve the initialization promise", async () => {
    await expect(provider.initialization).resolves.toBeUndefined();
  });

  it("should parse a public address and look up the geo information", async () => {
    const ip = faker.internet.ipv4();
    const ipInfo = { country: "BR", city: "São Paulo" } as Lookup;
    lookupMock.mockReturnValueOnce(ipInfo);

    const requester: IAgentInfoDTO = {
      ip,
      isDesktop: true,
      isMobile: false,
      browser: { name: "Chrome", version: "120" },
      origin: { host: "example.com", url: "https://example.com" },
      os: "macOS",
      platform: "Apple Mac",
    };

    const result = await provider.lookup(requester);

    expect(lookupMock).toHaveBeenCalledWith(ip);
    expect(result).toEqual({
      desktop: true,
      mobile: false,
      ip,
      ip_info: ipInfo,
      browser_name: "Chrome",
      browser_version: "120",
      origin_host: "example.com",
      origin_url: "https://example.com",
      os: "macOS",
      platform: "Apple Mac",
    });
  });

  it("should return a null ip_info for the IPv4 localhost address", async () => {
    const result = await provider.lookup({ ip: "127.0.0.1" });

    expect(lookupMock).not.toHaveBeenCalled();
    expect(result?.ip_info).toBeNull();
    expect(result?.browser_name).toBeUndefined();
    expect(result?.origin_host).toBeUndefined();
  });

  it("should return a null ip_info for the IPv6 localhost address", async () => {
    const result = await provider.lookup({ ip: "::1" });

    expect(lookupMock).not.toHaveBeenCalled();
    expect(result?.ip_info).toBeNull();
  });

  it("should return a null ip_info when the ip is undefined", async () => {
    const result = await provider.lookup({ isDesktop: true });

    expect(lookupMock).not.toHaveBeenCalled();
    expect(result?.ip_info).toBeNull();
  });

  it("should return a null ip_info when the geo lookup misses", async () => {
    lookupMock.mockReturnValueOnce(null);

    const result = await provider.lookup({ ip: faker.internet.ipv4() });

    expect(result?.ip_info).toBeNull();
  });
});
