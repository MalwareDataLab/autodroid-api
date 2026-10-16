import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

const vitestWorkerGuard = new URL("../vitestWorkerGuard.mjs", import.meta.url)
  .href;

const UNREACHABLE_DATABASE_URL = "postgresql://unit:unit@127.0.0.1:1/never";

const COVERAGE_EXCLUDE = [
  "**/*.spec.ts",
  "**/*.test.ts",
  "**/*.e2e.test.ts",
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
  "**/*.mock.ts",
  "**/entities/factories/**",
  "src/shared/infrastructure/graphql/generated/**",
  "src/shared/container/index.ts",
  "src/shared/container/repositories/index.ts",
  "src/shared/container/providers/*/index.ts",
  "src/shared/container/providers/*/implementations/index.ts",
  "src/shared/container/providers/JobProvider/jobs/index.ts",
  "src/shared/infrastructure/graphql/resolvers.ts",
  "**/*.constant.ts",
  "**/constants/**",
  "**/*.schema.ts",
  "!src/modules/file/entities/file.entity.ts",
  "!src/modules/mcpAuthorization/entities/mcpAuthorizationGrant.entity.ts",
  "!src/modules/pagination/entities/paginationConnection.entity.ts",
  "!src/modules/pagination/entities/paginationEdge.entity.ts",
  "!src/modules/processing/entities/processingTimeEstimation.entity.ts",
  "!src/modules/user/entities/user.entity.ts",
  "!src/modules/sorting/schemas/sorting.schema.ts",
  "!src/modules/mcp/constants/mcpAccountTools.constant.ts",
  "!src/modules/mcp/constants/mcpAdminProcessorTools.constant.ts",
  "!src/modules/mcp/constants/mcpDatasetTools.constant.ts",
  "!src/modules/mcp/constants/mcpGraphQLSelection.constant.ts",
  "!src/modules/mcp/schemas/mcpToolInput.schema.ts",
  "!src/shared/container/index.ts",
  "!src/shared/container/repositories/index.ts",
  "!src/shared/container/providers/AuthenticationProvider/index.ts",
  "!src/shared/container/providers/InMemoryDatabaseProvider/index.ts",
];

const RESOLVER_FILES = "src/**/*.resolver.ts";

const FULL_COVERAGE = {
  lines: 100,
  functions: 100,
  branches: 100,
  statements: 100,
};

const COVERAGE_SCOPE_BY_LANE = {
  all: {
    include: ["src/**/*.ts"],
    exclude: COVERAGE_EXCLUDE,
    reportsDirectory: "test/outputs/coverage",
    thresholds: FULL_COVERAGE,
  },
  unit: {
    include: ["src/**/*.ts"],
    exclude: [...COVERAGE_EXCLUDE, RESOLVER_FILES],
    reportsDirectory: "test/outputs/coverage-unit",
    thresholds: FULL_COVERAGE,
  },
  integration: {
    include: ["src/**/*.service.ts", "src/**/*.repository.ts"],
    exclude: COVERAGE_EXCLUDE,
    reportsDirectory: "test/outputs/coverage-integration",
    thresholds: {},
  },
  e2e: {
    include: [RESOLVER_FILES],
    exclude: COVERAGE_EXCLUDE,
    reportsDirectory: "test/outputs/coverage-e2e",
    thresholds: FULL_COVERAGE,
  },
};

const coverageLane = process.env.COVERAGE_LANE ?? "all";

if (!Object.hasOwn(COVERAGE_SCOPE_BY_LANE, coverageLane))
  throw new Error(
    `COVERAGE_LANE must be one of ${Object.keys(COVERAGE_SCOPE_BY_LANE).join(", ")}; received "${coverageLane}".`,
  );

const coverageScope =
  COVERAGE_SCOPE_BY_LANE[coverageLane as keyof typeof COVERAGE_SCOPE_BY_LANE];

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 20000,
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    env: { TZ: "UTC" },
    expect: { requireAssertions: true },
    chaiConfig: { truncateThreshold: 0 },
    pool: "forks",
    poolOptions: {
      forks: {
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
      // matches istanbul's accuracy at v8's speed.
      experimentalAstAwareRemapping: true,
      reportsDirectory: coverageScope.reportsDirectory,
      reporter: ["json", "json-summary", "text-summary", "html"],
      all: true,
      reportOnFailure: true,
      include: coverageScope.include,
      exclude: coverageScope.exclude,
      thresholds: coverageScope.thresholds,
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
          globalSetup: [
            "test/config/integration/globalSetup.ts",
            "test/config/e2e/globalSetup.ts",
          ],
          setupFiles: [
            "test/config/integration/setup.ts",
            "test/config/e2e/storageEmulator.setup.ts",
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
            "**/*.live.test.ts",
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
          name: "live-host",
          include: ["**/*.live.test.ts"],
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
