import { TestContext as CustomTextContext } from "./testContext.type";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface TestContext extends CustomTextContext {}
}

export {};
