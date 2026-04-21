import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PQ_BASE_URL ?? "http://localhost:3000";

// PQ_RUN_DIR is set by LocalRunner for per-request isolation. When not set,
// Playwright discovers tests under `.sandbox` (mainly useful for ad-hoc CLI runs).
const testDir = process.env.PQ_RUN_DIR ?? "./.sandbox";

export default defineConfig({
  testDir,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
