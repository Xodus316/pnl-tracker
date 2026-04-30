import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  "postgresql://pnl:changeme@localhost:5434/pnl?schema=test";

export default defineConfig({
  test: {
    globals: false,
    include: ["tests/**/*.test.ts"],
    globalSetup: "./tests/global-setup.ts",
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
});
