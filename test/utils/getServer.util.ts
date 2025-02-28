import { container } from "tsyringe";

// Container import
import { initAndWaitRequisites } from "@shared/container";

// Provider import
import { IAuthenticationProvider } from "@shared/container/providers/AuthenticationProvider/models/IAuthentication.provider";

export const getServer = async () => {
  await initAndWaitRequisites();
  const { App } = await import("@shared/infrastructure/http/app");

  const app = new App();
  await app.graphqlServer.initialization;
  return app;
};

export type App = Awaited<ReturnType<typeof getServer>>;

export const disposeServer = async (app: App) => {
  app?.httpServer?.close();
  app?.websocketServer?.server?.close();
  await app?.graphqlServer?.server?.stop();

  const authenticationProvider = container.resolve<IAuthenticationProvider>(
    "AuthenticationProvider",
  );
  await authenticationProvider.dispose();
};
