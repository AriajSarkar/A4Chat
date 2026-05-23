/**
 * Auto-sync Prisma schema → SQLite without data loss.
 *
 * Runs:
 *   1. `prisma generate`  — regenerate the typed client
 *   2. `prisma db push`   — apply schema changes non-destructively
 *
 * If the push would destroy data, it logs a warning and skips
 * (you'll need to run `prisma migrate dev` manually in that case).
 *
 * Usage: node scripts/prisma-sync.mjs
 */
import { execSync } from "node:child_process";

function run(cmd, label) {
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ ${label}`);
    return true;
  } catch {
    console.warn(`⚠️  ${label} — failed (see above)`);
    return false;
  }
}

console.log("🔄 Prisma auto-sync…\n");

// 1. Generate typed client
run("npx prisma generate", "Generated Prisma Client");

// 2. Push schema non-destructively (no --force-reset)
const pushOk = run("npx prisma db push", "Schema pushed to dev.db");

if (!pushOk) {
  console.log("\n💡 If the push failed due to breaking changes, run:");
  console.log("   npx prisma db push --accept-data-loss");
  console.log("   (this will drop columns/tables that changed)");
}

console.log("\n✨ Prisma sync done.\n");
