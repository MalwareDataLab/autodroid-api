import { describe, expect, it } from "vitest";

// Test target import
import { DateUtils } from ".";

describe("Utils: DateUtils", () => {
  const earlier = "2024-01-01T00:00:00.000Z";
  const later = "2024-01-02T00:00:00.000Z";

  it("should return true when the first date is after the second", () => {
    expect(DateUtils.isAfter(later, earlier)).toBe(true);
  });

  it("should return true when the first date is before the second", () => {
    expect(DateUtils.isBefore(earlier, later)).toBe(true);
  });

  it("should return true when both dates are the same", () => {
    expect(DateUtils.isSame(earlier, earlier)).toBe(true);
  });

  it("should return the current utc date", () => {
    expect(DateUtils.now().isValid()).toBe(true);
  });

  it("should add the given amount of time to a date", () => {
    expect(DateUtils.add(earlier, 1, "day").toISOString()).toBe(later);
  });

  it("should subtract the given amount of time from a date", () => {
    expect(DateUtils.subtract(later, 1, "day").toISOString()).toBe(earlier);
  });

  it("should format a date with the given format string", () => {
    expect(DateUtils.format(earlier, "YYYY-MM-DD")).toBe("2024-01-01");
  });

  it("should parse an ISO string into a utc date", () => {
    expect(DateUtils.parseISOString(earlier).toISOString()).toBe(earlier);
  });

  it("should parse a date with the given config", () => {
    expect(DateUtils.parse(earlier).toISOString()).toBe(earlier);
  });
});
