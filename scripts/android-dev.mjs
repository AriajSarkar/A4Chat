#!/usr/bin/env node
import net from "node:net";
import { spawn } from "node:child_process";

const devPort = process.env.TAURI_DEV_PORT || "3000";

process.env.TAURI_DEV_PORT = devPort;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const settle = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(350);
    socket.once("connect", () => settle(true));
    socket.once("timeout", () => settle(false));
    socket.once("error", () => settle(false));
  });
}

async function main() {
  const port = Number.parseInt(devPort, 10) || 3000;
  const alreadyRunning = await isPortOpen(port);

  if (alreadyRunning) {
    console.log(`==> Reusing existing Next.js dev server on port ${port}`);
    return 0;
  }

  console.log(`==> Starting Next.js dev server on port ${port}`);

  const child = spawn("pnpm", ["dev"], {
    stdio: "inherit",
    env: process.env,
    shell: true,
    detached: true,
  });

  child.unref();

  const start = Date.now();
  const timeoutMs = 30_000;

  while (!(await isPortOpen(port))) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Next.js dev server did not become ready on port ${port} in time.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`==> Next.js dev server is ready on port ${port}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
