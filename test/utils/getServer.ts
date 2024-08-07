import { initContainer, waitPreRequisites } from "@shared/container";

export const getServer = async () => {
  await initContainer();
  await waitPreRequisites();
  const { app } = await import("@shared/infrastructure/http/app");

  await app.graphqlServer.initialization;

  return app;
};

export type App = Awaited<ReturnType<typeof getServer>>;

export const disposeServer = async (app: App) => {
  app?.httpServer?.close();
  app?.websocketServer?.server?.close();
  app?.graphqlServer?.server?.stop();
};
