import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Runs once, before any e2e test file starts (not per-file) — both packages'
// dist/ must be fresh for the e2e tier's tests to exercise the real
// deployment artifact. Doing this here (not inside a test's own beforeAll)
// gives the filesystem time to settle before the next file's cold ts-node
// compile resolves "autodroid-cli" through the workspace symlink — running
// the rebuild immediately before that resolution (as a sibling test file's
// beforeAll did) was flaky under WSL2's filesystem visibility lag.
const REPO_ROOT = join(__dirname, "..", "..", "..", "..", "..");

export default function setup() {
  execFileSync("yarn", ["workspace", "autodroid-cli", "build"], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  execFileSync("yarn", ["workspace", "autodroid-mcp", "build"], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
}
