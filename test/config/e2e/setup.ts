import { afterEach, beforeEach } from "vitest";

// Util import
import { disposeServer, getServer } from "@/test/utils/getServer.util";
import { startAndGetSessionToken } from "@/test/utils/startAndGetSessionToken.util";
import {
  initSecondaryProviders,
  initAndWaitPreRequisites,
} from "@shared/container";

beforeEach(async context => {
  initSecondaryProviders(context.container);
  initAndWaitPreRequisites(context.container);
  context.app = await getServer();
  context.session = await startAndGetSessionToken();
}, 60000);

afterEach(async context => {
  await disposeServer(context.app!);
}, 60000);
