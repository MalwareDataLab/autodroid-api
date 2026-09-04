import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const vitestWorkerGuard = new URL(
  "../../../test/vitestWorkerGuard.mjs",
  import.meta.url,
).href;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        // Vitest 3.2.4: execArgv lives on poolOptions.forks, not test.execArgv.
        execArgv: [`--import=${vitestWorkerGuard}`],
      },
    },
    globals: true,
    expect: { requireAssertions: true },
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: "test/outputs/coverage",
      reporter: ["json-summary", "text-summary", "html"],
      all: true,
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.d.ts",
        "**/*.type.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          // Real stdio process spawn, zero mocking — no DB/globalSetup needed.
          // A cold ts-node compile across two workspace packages regularly
          // exceeds vitest's stock 5s default. fileParallelism:false — two
          // files here each spawn real subprocesses (one rebuilds+spawns
          // dist/bin.js, the other cold-compiles via ts-node); run
          // concurrently they starve each other's stdio handshake under CPU
          // pressure, causing real (reproduced) flakiness.
          name: "e2e",
          include: ["**/*.process-e2e.test.ts"],
          testTimeout: 30000,
          fileParallelism: false,
          globalSetup: ["test/config/e2e/globalSetup.ts"],
        },
      },
      {
        extends: true,
        test: {
          // Hits the real Claude API via the `claude` CLI — real cost, real
          // 3rd party, opt-in only (test:external), never part of `test`.
          // 90s: real model reasoning latency varies noticeably run to run
          // (observed 5s-80s for the same prompt against the same stub).
          name: "external",
          include: ["**/*.external.test.ts"],
          testTimeout: 90000,
        },
      },
    ],
  },
});
