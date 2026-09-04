import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";

// Util import
import { parseNodemailerAddresses } from "./parseNodemailerAddresses.util";

describe("Utils: parseNodemailerAddresses", () => {
  it("should return undefined when recipients are not provided", () => {
    expect(parseNodemailerAddresses()).toBeUndefined();
  });

  it("should map a recipient with a name to a named address object", () => {
    const email = faker.internet.email();
    const name = faker.person.fullName();

    expect(parseNodemailerAddresses([{ email, name }])).toEqual([
      { name, address: email },
    ]);
  });

  it("should map a recipient without a name to the plain email string", () => {
    const email = faker.internet.email();

    expect(parseNodemailerAddresses([{ email }])).toEqual([email]);
  });
});
