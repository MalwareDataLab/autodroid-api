# autodroid-cli

Command-line client for the AutoDroid API. Also powers `autodroid-mcp` (same package, imported directly — not a separate implementation).

## Install

This package is private (not published to npm) — it's consumed from within this monorepo:

```bash
yarn install
yarn workspace autodroid-cli build
node_modules/.bin/autodroid --help    # yarn workspaces symlink the built binary here
```

## Configure

Required environment variables:

| Variable | Purpose |
|---|---|
| `AUTODROID_CLI_API_URL` | GraphQL endpoint, e.g. `https://api.autodroid.example/graphql` |
| `AUTODROID_CLI_FIREBASE_WEB_API_KEY` | Firebase Web API key used for `login` |

Optional:

| Variable | Purpose |
|---|---|
| `AUTODROID_CLI_PASSWORD` | Non-interactive password for `login` (avoids `--password` leaking into shell history / `ps`) |

## Usage

```bash
autodroid login --email you@example.com          # prompts for a masked password
autodroid whoami                                  # formatted table output
autodroid whoami --json                           # raw JSON, for scripting
autodroid datasets --first 20
autodroid processors
autodroid processes
autodroid profile update --name "Ada Lovelace" [--phone-number ...] [--language ...] [--notifications-enabled]
autodroid processing show <processingId>          # or the bare form: autodroid processing <processingId>
autodroid processing run --dataset-id <id> --processor-id <id> [--param name=value ...]
autodroid processing estimate --dataset-id <id> --processor-id <id>   # before starting a run
autodroid processing finish-estimate <processingId>                   # for an in-progress run
autodroid logout
```

`processing run`'s `--param` values are validated server-side against the processor's declared parameters (`autodroid processors` returns each processor's `configuration.parameters` — name, type, whether it's required) — unknown, missing-required, or wrong-type parameters are rejected.

Session credentials are stored at `~/.autodroid/session.json` (owner-only permissions, atomic writes) and refreshed automatically.

## Development

```bash
yarn test:coverage   # 100% lines/branches/functions/statements required
yarn lint             # eslint + tsc
yarn build            # tsup -> dist/bin.js
```
