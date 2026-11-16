import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Loaded before workers spawn, so DATABASE_URL/REDIS_URL/etc. from .env.test
// (not .env) are what every src/ import sees during tests.
dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
