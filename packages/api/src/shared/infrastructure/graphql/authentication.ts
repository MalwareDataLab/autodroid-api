import { AuthChecker } from "type-graphql";

import { GraphQLContext } from "./context";

const authenticationHandler: AuthChecker<GraphQLContext> = (
  { context: { user_session, worker_session } },
  roles,
) => {
  // if `@Authorized()`, check only if user exists
  if (roles.length === 0) return user_session?.user?.id !== undefined;

  if (!user_session) return false;

  if (roles.includes("ADMIN") && user_session.is_admin) return true;

  if (roles.includes("WORKER") && worker_session?.worker?.id) return true;

  return false;
};

export { authenticationHandler };
