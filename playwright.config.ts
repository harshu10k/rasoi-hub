import { defineConfig } from "@playwright/test";

// Supabase keys come from .env.local; test-account logins from .env.test.local (see tests/README.md). Both are git-ignored.
for (const file of [".env.local", ".env.test.local"]) {
  try { process.loadEnvFile(file); } catch { /* optional */ }
}

const baseURL = process.env.RASOI_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests",
  globalTeardown: "./tests/global-teardown.ts",
  // Tests share two real accounts and the database's spam limits, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL, channel: "chrome", headless: true, viewport: { width: 1280, height: 900 }, trace: "retain-on-failure" },
  // Starts `npm run dev` for local runs; reuses it if already running. Skipped when testing the live site.
  webServer: baseURL.startsWith("http://localhost") ? { command: "npm run dev", url: baseURL + "/login", reuseExistingServer: true, timeout: 120_000 } : undefined,
});
