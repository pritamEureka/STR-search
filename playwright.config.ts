import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const CI = !!process.env.CI;

/**
 * The default suite is fully hermetic: the browser talks to Next, and every `/api/**`
 * request is answered by an in-memory fake (tests/e2e/support/mock-api.ts). No backend,
 * database or network is needed, so runs are deterministic and parallel-safe.
 *
 * `npm run test:e2e:live` additionally runs tests/live/** against the real FastAPI service.
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 4, // capped: a production Next server + N browsers on one box gets timing-flaky past this
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 45_000,
  expect: { timeout: 12_000 },

  use: {
    baseURL: BASE_URL,
    // Failure artifacts: everything needed to diagnose a red test without re-running it.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1366, height: 900 },
  },

  projects: [
    { name: "mocked", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    {
      name: "live",
      testDir: "./tests/live",
      // Opt-in: touches the real database. Run with `npm run test:e2e:live`.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
      workers: 1,
      fullyParallel: false,
    },
  ],

  webServer: {
    // Production build = no dev-mode compile lag, so timing-sensitive assertions stay stable.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 240_000,
    env: { API_URL: process.env.API_URL ?? "http://localhost:8000" },
  },
});
