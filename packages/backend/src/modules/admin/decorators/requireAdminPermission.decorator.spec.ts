import { describe, it, expect, vi } from "vitest";

import { RequireAdminPermission } from "./requireAdminPermission.decorator";

const setupClassDouble = (flag: () => void) => {
  class ServiceTest {
    @RequireAdminPermission()
    public async execute(_?: { user?: { is_admin?: boolean } }) {
      flag();
    }
  }

  return new ServiceTest();
};

describe("Decorator: RequireAdminPermission", () => {
  it("should return a function", () => {
    const result = RequireAdminPermission();
    expect(result).toBeInstanceOf(Function);
  });

  it("should continue the original method if the user is an admin", () => {
    const flag = vi.fn();

    class DecoratorTest {
      testMethod(_?: { user?: { is_admin?: boolean } }) {
        return flag();
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      DecoratorTest.prototype,
      DecoratorTest.prototype.testMethod.name,
    ) as PropertyDescriptor;

    const result = RequireAdminPermission()(
      DecoratorTest.prototype,
      DecoratorTest.prototype.testMethod.name,
      descriptor,
    );

    expect(() =>
      new DecoratorTest().testMethod({ user: { is_admin: true } }),
    ).not.toThrow();
    expect(result).toBe(descriptor);
    expect(flag).toHaveBeenCalledTimes(1);
  });

  it("should continue the original method if the user is an admin in a class", () => {
    const flag = vi.fn();
    const instance = setupClassDouble(flag);

    expect(() => instance.execute({ user: { is_admin: true } })).not.toThrow();
    expect(flag).toHaveBeenCalledTimes(1);
  });

  it("should throw if the user is not an admin", () => {
    const flag = vi.fn();
    const instance = setupClassDouble(flag);

    expect(() => instance.execute({ user: { is_admin: false } })).toThrow();
    expect(flag).not.toHaveBeenCalled();
  });

  it("should throw if the user is admin info was not provided", () => {
    const flag = vi.fn();
    const instance = setupClassDouble(flag);

    expect(() => instance.execute({ user: {} })).toThrow();
    expect(flag).not.toHaveBeenCalled();
  });

  it("should throw if the user is not defined", () => {
    const flag = vi.fn();
    const instance = setupClassDouble(flag);

    expect(() => instance.execute({})).toThrow();
    expect(flag).not.toHaveBeenCalled();
  });

  it("should throw if no param was provided", () => {
    const flag = vi.fn();
    const instance = setupClassDouble(flag);

    expect(() => instance.execute()).toThrow();
    expect(flag).not.toHaveBeenCalled();
  });
});
