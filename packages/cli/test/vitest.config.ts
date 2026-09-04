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
    globalSetup: ["test/config/e2e/globalSetup.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: "test/outputs/coverage",
      reporter: ["json-summary", "text-summary", "html"],
      all: true,
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      exclude: ["**/*.spec.ts", "**/*.test.ts", "**/*.d.ts", "**/*.type.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
