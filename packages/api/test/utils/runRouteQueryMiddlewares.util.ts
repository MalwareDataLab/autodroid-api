import { Router } from "express";

type RouteQueryOutcome =
  | { refused: { status: number; body: unknown } }
  | { pagination: unknown; sorting: unknown };

const runRouteQueryMiddlewares = async (
  router: Router,
  path: string,
  query: Record<string, string>,
): Promise<RouteQueryOutcome> => {
  const routeLayer = (router as any).stack.find(
    (layer: any) => layer.route?.path === path && layer.route.methods.get,
  );
  const middlewares: any[] = routeLayer.route.stack
    .slice(0, -1)
    .map((layer: any) => layer.handle);
  const request: any = {
    query,
    t: (key: string, fallback?: string) => fallback ?? key,
  };

  return middlewares
    .reduce<Promise<RouteQueryOutcome | null>>(
      async (previous, middleware) =>
        (await previous) ??
        new Promise(resolve => {
          Promise.resolve(
            middleware(
              request,
              {
                status: (status: number) => ({
                  json: (body: unknown) =>
                    resolve({ refused: { status, body } }),
                }),
              },
              () => resolve(null),
            ),
          ).catch(error =>
            resolve({ refused: { status: error.statusCode, body: error } }),
          );
        }),
      Promise.resolve(null),
    )
    .then(
      outcome =>
        outcome ?? { pagination: request.pagination, sorting: request.sorting },
    );
};

export { runRouteQueryMiddlewares };
