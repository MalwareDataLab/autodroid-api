import { IFirebaseSessionDTO } from "../utils/startAndGetSessionToken.util";
import { TestContext as CustomTextContext } from "./testContext.type";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface TestContext extends CustomTextContext {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ProvidedContext {
    adminSession: IFirebaseSessionDTO;
    userSession: IFirebaseSessionDTO;
    relationalDatabase: {
      baseUri: string;
      administratorUrl: string;
      template: string;
    };
    nonRelationalDatabase: { baseUri: string };
    inMemoryDatabase: { host: string; port: number };
  }
}

export {};
