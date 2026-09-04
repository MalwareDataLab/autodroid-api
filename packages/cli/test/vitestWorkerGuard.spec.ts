import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

const guardHref = new URL(
  "../../../test/vitestWorkerGuard.mjs",
  import.meta.url,
).href;

describe("Vitest worker parent-death guard", () => {
  it("should be loaded into this vitest worker via execArgv", () => {
    expect(
      process.execArgv.some(arg => arg.includes("vitestWorkerGuard.mjs")),
    ).toBe(true);
  });

  it("should SIGKILL the process when the IPC channel disconnects", async () => {
    const child = spawn(
      process.execPath,
      [
        `--import=${guardHref}`,
        "-e",
        "process.send('ready'); setInterval(() => {}, 1 << 30);",
      ],
      { stdio: ["ignore", "ignore", "pipe", "ipc"] },
    );

    const stderrChunks: Buffer[] = [];
    child.stderr?.on("data", chunk => {
      stderrChunks.push(chunk);
    });

    await new Promise<void>((resolve, reject) => {
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        reject(
          new Error(
            `child exited before ready: code=${code} signal=${signal} stderr=${Buffer.concat(stderrChunks).toString()}`,
          ),
        );
      };
      child.once("exit", onExit);
      child.once("message", message => {
        child.off("exit", onExit);
        if (message === "ready") {
          resolve();
          return;
        }
        reject(new Error(`unexpected message: ${String(message)}`));
      });
    });

    const { pid } = child;
    expect(pid).toEqual(expect.any(Number));

    try {
      const exited = new Promise<{
        code: number | null;
        signal: NodeJS.Signals | null;
      }>(resolve => {
        child.once("exit", (code, signal) => resolve({ code, signal }));
      });

      child.disconnect();

      const { code, signal } = await exited;
      expect(signal).toBe("SIGKILL");
      expect(code).toBeNull();
      expect(() => process.kill(pid as number, 0)).toThrow();
    } finally {
      try {
        process.kill(pid as number, "SIGKILL");
      } catch {}
    }
  });
});
