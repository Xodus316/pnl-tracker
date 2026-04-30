import { execSync } from "node:child_process";

export default async function globalSetup() {
  const url =
    process.env.DATABASE_URL_TEST ||
    "postgresql://pnl:changeme@localhost:5434/pnl?schema=test";
  // Ensure the schema and tables exist for tests.
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
