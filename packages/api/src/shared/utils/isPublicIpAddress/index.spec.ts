import { describe, expect, it } from "vitest";

// Target import
import { isPublicIpAddress } from ".";

describe("Util: isPublicIpAddress", () => {
  it.each([
    ["8.8.8.8", true],
    ["1.1.1.1", true],
    ["2606:4700:4700::1111", true],

    ["127.0.0.1", false],
    ["::1", false],

    ["10.0.0.5", false],
    ["172.16.0.5", false],
    ["192.168.1.5", false],

    ["169.254.169.254", false],
    ["169.254.0.1", false],

    ["100.64.0.1", false],

    ["fc00::1", false],

    ["::ffff:127.0.0.1", false],
    ["::ffff:10.0.0.5", false],

    ["224.0.0.1", false],
    ["255.255.255.255", false],

    ["198.18.0.1", false],
    ["198.19.255.254", false],
    ["192.0.2.1", false],
    ["198.51.100.7", false],
    ["203.0.113.9", false],
    ["192.31.196.1", false],
    ["192.52.193.1", false],
    ["192.175.48.1", false],
    ["64:ff9b::808:808", false],
    ["64:ff9b:1::a00:1", false],
    ["100::1", false],
    ["2001:10::1", false],
    ["2001:db8::1", false],
    ["2002:7f00:1::1", false],
    ["3fff::1", false],
    ["5f00::1", false],

    ["198.20.0.1", true],
    ["198.17.255.254", true],
    ["2a00:1450:4001::1", true],

    ["not-an-ip-address", false],
    ["", false],
  ])("should classify %s as public=%s", (address, expected) => {
    expect(isPublicIpAddress(address)).toBe(expected);
  });
});
