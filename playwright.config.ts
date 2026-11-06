import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8081";
const testAgainstRemoteSite = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  webServer: testAgainstRemoteSite
    ? undefined
    : {
        command: "npx expo start --web --port 8081",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { ...process.env, BROWSER: "none" },
      },
});
