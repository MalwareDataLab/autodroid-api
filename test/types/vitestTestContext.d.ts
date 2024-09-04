import { TestContext as CustomTextContext } from "./testContext.type";

declare module "vitest" {
  export interface TestContext extends CustomTextContext {}
}

export {};
