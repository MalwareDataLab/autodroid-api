import {
  Authorized,
  Directive,
  FieldResolver,
  Resolver,
  ResolverInterface,
  Root,
} from "type-graphql";

// Util import
import { withoutWorkerRegistrationTokenValue } from "@modules/worker/utils/withoutWorkerRegistrationTokenValue.util";

// Entity import
import { Worker } from "@modules/worker/entities/worker.entity";
import { WorkerRegistrationToken } from "@modules/worker/entities/workerRegistrationToken.entity";

@Resolver(() => Worker)
class WorkerFieldResolver implements ResolverInterface<Worker> {
  @Authorized(["ADMIN"])
  @Directive("@auth(requires: ADMIN)")
  @FieldResolver(() => WorkerRegistrationToken)
  registration_token(@Root() worker: Worker): WorkerRegistrationToken {
    return withoutWorkerRegistrationTokenValue(worker.registration_token);
  }
}

export { WorkerFieldResolver };
