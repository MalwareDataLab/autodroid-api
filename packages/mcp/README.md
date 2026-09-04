# autodroid-mcp

MCP (Model Context Protocol) server exposing read-only AutoDroid data to any MCP-compatible IDE or AI harness (Claude Desktop, Cursor, etc.) over stdio. Thin wrapper around `autodroid-cli` — every tool is a passthrough to the same command implementation, so CLI and MCP never drift.

## Authenticate first

The MCP server has no `login` tool (interactive auth doesn't belong in an MCP tool call). Authenticate once via the CLI — both share the same session file (`~/.autodroid/session.json`):

```bash
autodroid login --email you@example.com
```

## Configure your IDE

This package is private (not published to npm) — build it from the monorepo first:

```bash
yarn install
yarn workspace autodroid-mcp build   # -> packages/mcp/dist/bin.js
```

Both `AUTODROID_CLI_API_URL` and `AUTODROID_CLI_FIREBASE_WEB_API_KEY` must be set in the MCP server's environment (same variables the CLI uses, see `packages/cli/README.md`).

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "autodroid": {
      "command": "node",
      "args": ["/absolute/path/to/autodroid-api-gateway/packages/mcp/dist/bin.js"],
      "env": {
        "AUTODROID_CLI_API_URL": "https://api.autodroid.example/graphql",
        "AUTODROID_CLI_FIREBASE_WEB_API_KEY": "your-firebase-web-api-key"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`): same `mcpServers` block as above.

Any other MCP-compatible host follows the same stdio-server shape — `command`/`args` to launch `dist/bin.js` with `node`, plus the two environment variables.

## Tools

Read-only by design — mutating operations (profile update, starting a processing run) stay CLI-only, the same way `login`/`logout` never became tools: no confirmation step exists for an agent tool call, so anything that spends compute or mutates state deliberately isn't exposed here.

| Tool | Backed by |
|---|---|
| `autodroid_whoami` | `autodroid whoami` |
| `autodroid_list_datasets` | `autodroid datasets` |
| `autodroid_list_processors` | `autodroid processors` |
| `autodroid_list_processes` | `autodroid processes` |
| `autodroid_show_processing` | `autodroid processing show <id>` |
| `autodroid_estimate_processing_time` | `autodroid processing estimate` |
| `autodroid_estimate_processing_finish` | `autodroid processing finish-estimate <id>` |

## Development

```bash
yarn test              # unit + e2e (e2e spawns a real subprocess over real stdio)
yarn test:external     # drives the real Claude API (Haiku) via the real `claude` CLI against the
                        # real built dist/bin.js — proves an actual model correctly selects and
                        # invokes each tool. Real cost, real 3rd party, opt-in only, skips
                        # cleanly if `claude` isn't installed.
yarn lint               # eslint + tsc
yarn build              # tsup -> dist/bin.js
```
