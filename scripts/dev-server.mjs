#!/usr/bin/env node
/**
 * Shared beforeDevCommand for both desktop and android Tauri dev.
 *
 * Two modes:
 * 1. Port 3000 is already in use (another Tauri dev instance is running)
 *    → exit 0 immediately; Tauri will connect to the existing devUrl.
 * 2. Port 3000 is free (first instance)
 *    → start `pnpm dev` as a foreground child so Tauri manages its lifecycle.
 */
import net from "node:net";
import { spawn } from "node:child_process";

const PORT = 3000;

/** Resolve true if something is already listening on the given port. */
function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(400);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (await isPortListening(PORT)) {
    console.log(`==> Next.js already running on port ${PORT} — reusing it`);
    return;
  }

  console.log(`==> Starting Next.js dev server on port ${PORT}`);

  const child = spawn("pnpm", ["dev"], {
    stdio: "inherit",
    shell: true,
  });

  // Forward termination signals so Tauri can shut us down cleanly
  for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => child.kill(sig));
  }

  // Stay alive as long as the child is running — Tauri expects
  // beforeDevCommand to keep running until it terminates it.
  await new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code && code !== 0) {
        reject(new Error(`Next.js exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
