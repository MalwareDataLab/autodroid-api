import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Configuration import
import { getSentryConfig } from "@config/sentry";

Sentry.init({
  ...getSentryConfig(),
  integrations: [nodeProfilingIntegration()],
});

Sentry.profiler.startProfiler();
