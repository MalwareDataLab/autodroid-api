import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..", "..");

export default function setup() {
  execFileSync("yarn", ["workspace", "autodroid-cli", "build"], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
}
