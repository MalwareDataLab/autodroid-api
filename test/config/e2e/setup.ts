import { afterAll, beforeAll } from "vitest";

// Util import
import { disposeServer, getServer } from "@/test/utils/getServer";
import { startAndGetSessionToken } from "@/test/utils/startAndGetSessionToken";

global.TestInjection = global.TestInjection || {};

beforeAll(async () => {
  global.TestInjection.app = await getServer();
  global.TestInjection.session = await startAndGetSessionToken();
}, 60000);

afterAll(async () => {
  await disposeServer(global.TestInjection.app);
}, 60000);
