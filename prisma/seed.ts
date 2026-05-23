import { PrismaClient } from "../public/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function seed() {
  await prisma.providerSetting.upsert({
    where: { id: "lmstudio" },
    create: {
      id: "lmstudio",
      label: "LM Studio",
      baseUrl: "http://localhost:1234/v1",
      model: "local-model",
      enabled: true,
    },
    update: {},
  });

  await prisma.providerSetting.upsert({
    where: { id: "openrouter" },
    create: {
      id: "openrouter",
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openrouter/auto",
      enabled: true,
    },
    update: {},
  });

  console.log("✓ Seeded default providers");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
