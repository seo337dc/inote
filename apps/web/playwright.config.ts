import { defineConfig, devices } from "@playwright/test";

// e2e 테스트는 inote-server(BE, :3200)가 로컬에서 같이 떠 있어야 통과한다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3011",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3011",
    reuseExistingServer: !process.env.CI,
  },
});
