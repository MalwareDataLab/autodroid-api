# AGENTS.md

Rules for every change to this repository, by people or agents. Setup and operation are documented for people in `README.md` and `docs/`.

## What this repository is

The AutoDroid server: REST, GraphQL and a remote MCP endpoint (`/mcp`). It is a Yarn monorepo with one workspace, `packages/api` (Node 24, TypeScript, Express, Apollo with type-graphql, Prisma on Postgres, MongoDB, Redis and Bull, tsyringe, Firebase sign-in). The client library, the `autodroid` CLI and the stdio MCP server live in the sibling repository `autodroid-sdk`; the web app in `autodroid-frontend`; the processing agent in `autodroid-worker`.

## Commands

Run from the repository root unless noted.

| Task | Command |
| --- | --- |
| Run in development | `yarn dev` |
| Lint and typecheck (ESLint with `--fix` and `tsc --noEmit`) | `yarn lint` |
| Build | `yarn build` |
| Prisma client, new migration | `yarn prisma:generate`, `yarn prisma:dev` |
| All tiers with one coverage gate | `yarn test` |
| One tier (from `packages/api`) | `yarn test:unit`, `yarn test:integration`, `yarn test:e2e` |
| Opt-in suites (from `packages/api`) | `yarn test:external`, `yarn test:live-host` |
| Files still below 100% coverage (from `packages/api`) | `yarn coverage:gaps` |

## Architecture rules

- Domain code lives in `packages/api/src/modules/<module>/`: `entities`, `repositories` (interfaces; the Prisma and MongoDB implementations sit in `infrastructure`), `schemas` (input validation), `services`, `infrastructure/graphql` and `infrastructure/http`. A service is an `@injectable()` class with one public `execute`.
- A business rule or validation lives in exactly one place: the service, or the schema class the resolver already uses. Resolvers, controllers and MCP tools never restate it.
- The MCP server (`src/modules/mcp`) runs every tool as a GraphQL operation on the same Apollo server as `/graphql` (`executeOperation`), with the session of the MCP token. Its only route is the `/mcp` endpoint itself (`infrastructure/http/routes/mcp.routes.ts`); tools make no REST calls and no service calls of their own. A tool's input is derived from the resolver's schema classes (`mcpToolInputShape.util.ts`); never write a second schema by hand. Tool definitions are in `src/modules/mcp/constants/`, and the fields a tool requests are in `mcpGraphQLSelection.constant.ts`.
- Fields guarded by `@Authorized(["ADMIN"])` (`payload`, `agent_info`, `registration_token`) never appear in the selection of a tool or operation that a regular user runs.
- The tool contract `test/fixtures/mcpToolContract.json` is a byte-for-byte copy of the SDK's `src/cli/operations/toolContract.json`. A tool change regenerates the SDK file (`yarn contract` there) and copies it here.
- OAuth for MCP is the `mcpAuthorization` module: one grant row per user, client and resource; access and refresh tokens only as hashes in Redis; a revocation applies on the next request. Keep `docs/MCP.md` in step with any change.
- `src/shared/infrastructure/graphql/generated/schema.gql` is emitted at startup and committed. After a schema change, regenerate the SDK (`yarn codegen` in `autodroid-sdk`, with `BACKEND_GRAPHQL_ENDPOINT` set to this file) and run its `yarn lint:schema`.
- Database changes go through `prisma/schema.prisma` and a new migration. A committed migration is never edited.
- A new environment variable is read in `src/shared/config` (older reads remain in `src/shared/infrastructure/saml` and `app`) and is added to `.env.example`, `.env.test.example` and `docs/CONFIGURATION.md`.

## Import sections

The comment lines that separate import sections (`// Service import`) are part of this design system. They are never omitted and never spelled differently.

### Layout

1. File header: a shebang and the comments that open the file (`/* eslint-disable ... */`) stay first, untouched.
2. Side-effect imports (`import "reflect-metadata";`), unlabeled, in their original relative order.
3. External imports, unlabeled: Node built-ins (`node:*`) first, then packages, each alphabetical by module specifier.
4. Internal imports (tsconfig `paths` aliases and relative paths): one section per label, in the order of the table below, each opened by `// <Label> import`.
5. Inside a section: alias imports before relative imports, then alphabetical by specifier, case-insensitive.
6. One blank line between sections, none inside one. A comment between imports (`// eslint-disable-next-line`, `// @ts-expect-error`) moves with the import below it.
7. Every import precedes every other statement.
8. A label with no import under it does not exist, and any other comment is not a label.

### Classification

Each internal import gets exactly one label, from the first rule that matches its resolved file.

1. `Target`: in a test file (`<name>.spec.ts`, `<name>.test.ts` and any other qualifier before `spec` or `test`), the module under test: the sibling `<name>` without the test suffix, else its longest existing dotted prefix (`cors.http.spec.ts` imports `./cors`), else `./index` when the first dot-separated token of `<name>` is its folder's name. Always the last section.
2. Extension: the "Extension" column.
3. File kind: the last dot-separated token of the file name, or the whole name when it has no dot (`user.service.ts` has kind `service`). `index` files skip this rule.
4. Directory: the nearest enclosing directory listed in the "Nearest directory" column.
5. No match: add the case to the table instead of inventing a label.

### Vocabulary

| # | Label | File kind | Nearest directory | Extension |
| --- | --- | --- | --- | --- |
| 1 | `i18n` |  | `i18n/` |  |
| 2 | `Configuration` |  | `config/` |  |
| 3 | `Error` | `error` | `errors/` |  |
| 4 | `Context` | `context` | `contexts/` |  |
| 5 | `Container` |  | `container/` |  |
| 6 | `Provider` | `provider` | `providers/` |  |
| 7 | `Decorator` | `decorator` | `decorators/` |  |
| 8 | `Guard` | `guard` | `guards/` |  |
| 9 | `Middleware` | `middleware` | `middlewares/` |  |
| 10 | `Util` | `util`, `utils` | `support/`, `utils/` |  |
| 11 | `Constant` | `constant`, `constants` | `constants/` |  |
| 12 | `Type` | `type`, `types` | `types/` |  |
| 13 | `Enum` | `enum` | `enums/` |  |
| 14 | `DTO` | `dto` |  |  |
| 15 | `Data` |  |  | `.json` |
| 16 | `Entity` | `entity` | `entities/` |  |
| 17 | `Schema` | `schema` | `schemas/` |  |
| 18 | `Repository` | `repository` | `repositories/` |  |
| 19 | `Factory` | `factory` | `factories/` |  |
| 20 | `Service` | `service` | `services/` |  |
| 21 | `Strategy` | `strategy` | `strategies/` |  |
| 22 | `Adapter` | `adapter` | `adapters/` |  |
| 23 | `Job` | `job` | `jobs/` |  |
| 24 | `Controller` | `controller` |  |  |
| 25 | `Resolver` | `resolver` | `resolvers/` |  |
| 26 | `Scalar` | `scalar` |  |  |
| 27 | `Router` | `route`, `router`, `routes` | `routes/` |  |
| 28 | `Infrastructure` |  | `infrastructure/` |  |
| 29 | `Target` | the module under test of a test file (rule 1) | | |

No other label exists. Package imports are external and carry no label. ESLint `import/order` is off, because its grouping contradicts this order.

```ts
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { inject, injectable } from "tsyringe";

// Configuration import
import { getMcpConfig } from "@config/mcp";

// Error import
import { AppError } from "@shared/errors/AppError";

// Provider import
import { IInMemoryDatabaseProvider } from "@shared/container/providers/InMemoryDatabaseProvider/models/IInMemoryDatabase.provider";

// Util import
import { hashBase64Url } from "@shared/utils/hashBase64Url";
import { isMcpAuthorizationGrantLive } from "../utils/mcpAuthorizationGrantRecord.util";

// Constant import
import { MCP_AUTHORIZATION_REFRESH_TOKEN_KEY_PREFIX } from "../constants/mcpAuthorization.constant";

// DTO import
import type { IMcpAuthorizationTokenRecordDTO } from "../types/IMcpAuthorizationRecord.dto";

// Repository import
import { IMcpAuthorizationGrantRepository } from "../repositories/IMcpAuthorizationGrant.repository";

// Service import
import { McpAuthorizationTokenIssueService } from "./mcpAuthorizationTokenIssue.service";
```

## Testing tiers

A tier is defined by what it mocks, nothing else.

| Tier | File | Mocked |
| --- | --- | --- |
| Unit | `*.spec.ts` | the database and every external dependency |
| Integration | `*.test.ts` | external dependencies only; the database is real (Postgres, MongoDB and Redis testcontainers) |
| E2E | `*.e2e.test.ts` | nothing |
| External and live | `*.external.test.ts`, `*.live.test.ts` | nothing; real third parties, opt-in and outside the default run |

- Services and repositories: unit and integration.
- GraphQL resolvers: e2e only.
- HTTP controllers: unit and e2e.
- Utils, middlewares and providers: unit only.
- Coverage: 100% of lines, statements, branches and functions, merged over the three default tiers. The unit lane also has its own 100% gate over `src/` (resolvers excluded), and the e2e lane has one over the resolvers.
- Authorization is tested as a regular user and as an administrator (`context.userAuthorized`, `context.adminAuthorized`), with the other user's data as the bad case.
- The live MCP host tests share one Firebase test account: do not run them together with the e2e tier.

## Git

Commits follow Conventional Commits (`docs/COMMIT_MESSAGE_GUIDELINES.md`). The pre-commit hook runs `yarn lint` and lint-staged, and the commit-msg hook runs commitlint.

## Comments

A comment that explains what code does means the code is unclear: rename or restructure it instead. The only comments allowed are:

- lint and TypeScript directives;
- the import section labels;
- the structure markers of entities and factories: `/** Base */`, `/** Entity */`, `/** Simulated */` and `/** Relations */` in factories, `/* Computed fields */` and `/* Relations */` in entities, and `// See <Name>FieldResolver` above a field that a field resolver owns;
- rare notes on a security constraint or an edge case the code cannot express.
