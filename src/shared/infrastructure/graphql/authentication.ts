import { AuthChecker } from "type-graphql";

import { GraphQLContext } from "./context";

const authenticationHandler: AuthChecker<GraphQLContext> = (
  { context: { session, worker_session } },
  roles,
) => {
  // if `@Authorized()`, check only if user exists
  if (roles.length === 0) return session?.user?.id !== undefined;

  if (!session) return false;

  if (roles.includes("ADMIN") && session.is_admin) return true;

  if (roles.includes("WORKER") && worker_session?.worker?.id) return true;

  return false;
};

export { authenticationHandler };
