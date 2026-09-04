import { describe, expect, it } from "vitest";

// Handler import
import { contextHandler } from "./context";

describe("GraphQL: contextHandler", () => {
  it("should map the express request fields into the graphql context", async () => {
    const req: any = {
      t: () => "translated",
      i18n: { language: "en" },
      language: "en",
      languages: ["en", "pt"],
      agent_info: { browser: { name: "chrome" } },
      user_session: { user: { id: "user-id" } },
      worker_session: { worker: { id: "worker-id" } },
    };
    const res: any = { locals: {} };

    const context = await contextHandler({ req, res } as any);

    expect(context).toMatchObject({
      req,
      res,
      t: req.t,
      i18n: req.i18n,
      language: "en",
      languages: ["en", "pt"],
      agent_info: req.agent_info,
      user_session: req.user_session,
      worker_session: req.worker_session,
    });
  });

  it("should keep the agent information undefined when it is absent on the request", async () => {
    const req: any = {
      t: () => "translated",
      i18n: {},
      language: "en",
      languages: ["en"],
      user_session: undefined,
      worker_session: undefined,
    };

    const context = await contextHandler({ req, res: {} } as any);

    expect(context.agent_info).toBeUndefined();
  });
});
