import { spawn } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const guardHref = new URL("./vitestWorkerGuard.mjs", import.meta.url).href;
const vitestBin = join(workspace, "node_modules", ".bin", "vitest");
const TRIALS = 5;
const WORKERS = 3;

function childPids(ppid) {
  const pids = [];
  for (const ent of readdirSync("/proc")) {
    if (!/^\d+$/.test(ent)) continue;
    try {
      const status = readFileSync(`/proc/${ent}/status`, "utf8");
      const match = status.match(/^PPid:\s+(\d+)/m);
      if (match && Number(match[1]) === ppid) pids.push(Number(ent));
    } catch {}
  }
  return pids;
}

function descendants(rootPid) {
  const found = [];
  const stack = [rootPid];
  const seen = new Set([rootPid]);
  while (stack.length > 0) {
    const pid = stack.pop();
    for (const child of childPids(pid)) {
      if (seen.has(child)) continue;
      seen.add(child);
      found.push(child);
      stack.push(child);
    }
  }
  return found;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function ppidOf(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, "utf8");
    const match = status.match(/^PPid:\s+(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function cmdlineOf(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim();
  } catch {
    return "";
  }
}

function killSilent(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch {}
}

async function waitFor(predicate, timeoutMs, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = predicate();
    if (value) return value;
    await delay(intervalMs);
  }
  return null;
}

function writeFixture(dir) {
  const execArgv = JSON.stringify([`--import=${guardHref}`]);
  writeFileSync(
    join(dir, "vitest.config.mjs"),
    `
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: true,
    coverage: { enabled: false },
    poolOptions: {
      forks: {
        minForks: ${WORKERS},
        maxForks: ${WORKERS},
        execArgv: ${execArgv},
      },
    },
  },
});
`,
  );
  for (const name of ["a", "b", "c"]) {
    writeFileSync(
      join(dir, `${name}.spec.js`),
      `import { it } from "vitest";\nit("hangs", () => new Promise(() => {}));\n`,
    );
  }
}

async function runTrial(trial) {
  mkdirSync(join(workspace, ".tmp"), { recursive: true });
  const dir = mkdtempSync(join(workspace, ".tmp", "vitest-worker-guard-"));
  writeFixture(dir);

  const child = spawn(
    vitestBin,
    ["run", "--config", join(dir, "vitest.config.mjs")],
    { cwd: dir, stdio: ["ignore", "pipe", "pipe"] },
  );
  const controllerPid = child.pid;
  if (!controllerPid) {
    throw new Error(`trial ${trial}: vitest failed to start`);
  }

  let stderr = "";
  child.stderr?.on("data", chunk => {
    stderr += chunk.toString();
  });

  let workerPids = [];
  try {
    const ready = await waitFor(() => {
      const pids = descendants(controllerPid).filter(pid =>
        cmdlineOf(pid).includes("vitestWorkerGuard.mjs"),
      );
      if (pids.length >= WORKERS) return pids;
      return null;
    }, 15000);

    if (!ready) {
      const all = descendants(controllerPid)
        .map(pid => `${pid} ppid=${ppidOf(pid)} cmd=${cmdlineOf(pid)}`)
        .join(" | ");
      throw new Error(
        `trial ${trial}: expected >= ${WORKERS} guard-imported workers under controller ${controllerPid}. descendants: ${all || "none"} stderr=${stderr}`,
      );
    }
    workerPids = ready;

    for (const pid of workerPids) {
      if (!isAlive(pid)) {
        throw new Error(`trial ${trial}: worker ${pid} died before SIGKILL`);
      }
    }

    process.kill(controllerPid, "SIGKILL");

    const leftover = await waitFor(() => {
      const living = workerPids.filter(isAlive);
      return living.length === 0 ? "gone" : null;
    }, 2000);

    const stillAlive = workerPids.filter(isAlive);
    if (leftover !== "gone" || stillAlive.length > 0) {
      const details = stillAlive
        .map(pid => `${pid} ppid=${ppidOf(pid)} cmd=${cmdlineOf(pid)}`)
        .join("; ");
      throw new Error(
        `trial ${trial}: workers survived controller SIGKILL: ${details}`,
      );
    }

    const ppid1 = workerPids.filter(pid => ppidOf(pid) === 1);
    if (ppid1.length > 0) {
      throw new Error(
        `trial ${trial}: workers reparented to PPID 1: ${ppid1.join(",")}`,
      );
    }

    process.stdout.write(
      `trial ${trial}: controller ${controllerPid} SIGKILL → workers ${workerPids.join(",")} gone, none PPID 1\n`,
    );
  } finally {
    killSilent(controllerPid);
    for (const pid of workerPids) killSilent(pid);
    try {
      child.kill("SIGKILL");
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
}

let failed = false;
for (let trial = 1; trial <= TRIALS; trial += 1) {
  try {
    await runTrial(trial);
  } catch (error) {
    failed = true;
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  }
}

if (failed) process.exit(1);
process.stdout.write(`PASS ${TRIALS}/${TRIALS} SIGKILL trials, Node ${process.version}\n`);
