import { afterEach, beforeEach, inject } from "vitest";
import request from "supertest";

// Util import
import { disposeServer, getServer } from "@/test/utils/getServer.util";
import {
  initSecondaryProviders,
  initAndWaitRequisites,
} from "@shared/container";

beforeEach(async context => {
  initSecondaryProviders(context.container);
  initAndWaitRequisites({ selectedContainer: context.container });
  context.app = await getServer();

  context.request = request(context.app.express);
  context.gql = request(context.app.express).post("/graphql");

  const adminSession = inject("adminSession");
  const userSession = inject("userSession");
  context.adminSession = adminSession;
  context.userSession = userSession;

  context.userAuthorized = arg =>
    arg.set("authorization", `Bearer ${userSession.idToken}`);
  context.adminAuthorized = arg =>
    arg.set("authorization", `Bearer ${adminSession.idToken}`);
}, 60000);

afterEach(async context => {
  await disposeServer(context.app!);
}, 60000);
