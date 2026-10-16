import ipaddr from "ipaddr.js";

const SPECIAL_USE_RANGES = [
  "192.31.196.0/24",
  "192.52.193.0/24",
  "192.175.48.0/24",
  "198.18.0.0/15",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/23",
  "3fff::/20",
  "5f00::/16",
].map(cidr => ipaddr.parseCIDR(cidr));

const isPublicIpAddress = (address: string): boolean => {
  try {
    const parsed = ipaddr.process(address);

    return (
      parsed.range() === "unicast" &&
      !SPECIAL_USE_RANGES.some(
        range =>
          parsed.kind() === range[0].kind() &&
          (parsed as ipaddr.IPv4).match(range as [ipaddr.IPv4, number]),
      )
    );
  } catch {
    return false;
  }
};

export { isPublicIpAddress };
