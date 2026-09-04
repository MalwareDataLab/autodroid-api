import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import swc from "unplugin-swc";
import { config } from "dotenv";

const vitestWorkerGuard = new URL(
  "../../../../test/vitestWorkerGuard.mjs",
  import.meta.url,
).href;

// The unit lane mocks every external, the database included. Pointing it at a
// dead socket turns that rule into something the machine enforces.
const UNREACHABLE_DATABASE_URL = "postgresql://unit:unit@127.0.0.1:1/never";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    // v8 coverage instruments every included source file, which slows the
    // per-test DB setup/teardown (repositories re-resolved against a fresh
    // database). The bare suite passed at 10s/30s but flaked under coverage;
    // 60s gives a deterministic margin. Pair with the fork cap below.
    testTimeout: 60000,
    hookTimeout: 60000,
    // Bound cleanup so a fork wedged on a saturated testcontainer is killed
    // rather than orphaned.
    teardownTimeout: 20000,
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    env: { TZ: "UTC" },
    // A test that asserts nothing still marks its lines covered; this makes that
    // impossible.
    expect: { requireAssertions: true },
    // Entities and GraphQL payloads exceed the 40-char default and print as
    // `{ Object (a, b) }`, which makes a failure undebuggable.
    chaiConfig: { truncateThreshold: 0 },
    // Each integration/e2e test creates and drops its own `test-<uuid>`
    // Postgres/Mongo database (replaying all migrations) against a SINGLE
    // shared testcontainer. At the default worker count the box runs many
    // files at once and saturates that container's I/O, so setup/teardown
    // hooks blow past hookTimeout and pg connections drop — green alone, red
    // in the full run. It also multiplies v8's per-fork memory, which OOM's
    // the run. Capping the pool keeps the shared DBs unsaturated and the
    // memory bounded. Unit tests are in-memory, so the cap costs them nothing.
    pool: "forks",
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
        // Vitest 3.2.4: execArgv lives on poolOptions.forks, not test.execArgv.
        // --import runs in the worker at Node startup (before any test file).
        execArgv: [`--import=${vitestWorkerGuard}`],
      },
    },
    reporters: [
      "verbose",
      ["html", { outputFile: "test/outputs/reporters/html/index.html" }],
    ],
    coverage: {
      enabled: true,
      provider: "v8",
      // Without this, v8 counts are remapped through v8-to-istanbul, which
      // misattributes branches in TS/decorator-heavy files. AST-aware remapping
      // matches istanbul's accuracy at v8's speed.
      experimentalAstAwareRemapping: true,
      reportsDirectory: "test/outputs/coverage",
      reporter: ["json", "json-summary", "text-summary", "html"],
      // Logic-surface denominator: measure every runtime-branching file, even
      // those no test touches yet (`all`), so 100% is machine-verifiable and
      // regressions surface. Declarative/generated/wiring files carry no
      // branches and are excluded below.
      all: true,
      // Emit coverage even when tests fail — the campaign is TDD, red runs are
      // expected, and the coverage delta is still needed to steer the next slice.
      reportOnFailure: true,
      include: ["src/**/*.ts"],
      exclude: [
        // Test files
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.e2e.test.ts",
        // Declarative / type-only (no runtime branches)
        "src/@types/**",
        "**/*.entity.ts",
        "**/*.dto.ts",
        "**/*.enum.ts",
        "**/*.d.ts",
        "**/*.type.ts",
        "**/*.types.ts",
        "**/types.ts",
        "**/I*.repository.ts",
        "**/models/I*.ts",
        // Test support
        "**/*.mock.ts",
        "**/entities/factories/**",
        // Generated
        "src/shared/infrastructure/graphql/generated/**",
        // DI wiring / registration lists / pure barrels
        "src/shared/container/index.ts",
        "src/shared/container/repositories/index.ts",
        "src/shared/container/providers/*/index.ts",
        "src/shared/container/providers/*/implementations/index.ts",
        "src/shared/container/providers/JobProvider/jobs/index.ts",
        "src/shared/infrastructure/graphql/resolvers.ts",
        // Declarative data / validation schemas
        "**/*.constant.ts",
        "**/constants/**",
        "**/*.schema.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["**/*.e2e.test.ts"],
          exclude: [...configDefaults.exclude, "**/*.spec.ts"],
          globalSetup: ["test/config/integration/globalSetup.ts"],
          setupFiles: [
            "test/config/integration/setup.ts",
            "test/config/e2e/setup.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["**/*.test.ts"],
          exclude: [
            ...configDefaults.exclude,
            "**/*.spec.ts",
            "**/*e2e.test.ts",
            "**/*.external.test.ts",
          ],
          globalSetup: ["test/config/integration/globalSetup.ts"],
          setupFiles: ["test/config/integration/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration-external",
          include: ["**/*.external.test.ts"],
          exclude: [
            ...configDefaults.exclude,
            "**/*.spec.ts",
            "**/*e2e.test.ts",
          ],
          globalSetup: ["test/config/integration/globalSetup.ts"],
          setupFiles: ["test/config/integration/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.spec.ts"],
          exclude: [
            ...configDefaults.exclude,
            "**/*.test.ts",
            "**/*e2e.test.ts",
          ],
          globalSetup: [],
          setupFiles: ["test/config/unit/setup.ts"],
          env: { DATABASE_URL: UNREACHABLE_DATABASE_URL },
        },
      },
    ],
  },
  plugins: [swc.vite(), tsconfigPaths()],
});
