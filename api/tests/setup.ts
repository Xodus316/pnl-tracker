import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";

beforeEach(async () => {
  // Order matters: trades references import_batches via FK.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "trades", "import_batches" RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
