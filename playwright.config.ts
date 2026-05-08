import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results/artifacts",
  fullyParallel: true,
  reporter: [["html", { outputFolder: "test-results/html-report" }], ["list"]],
  use: {
    baseURL: "https://demo.playwright.dev/todomvc",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "manual",
      testMatch: /.*\.manual\.test\.ts$/,
      timeout: 0, // Manual tests have no timeout (human speed)
      fullyParallel: false, // Manual tests run sequentially (one human tester)
      use: {
        headless: false, // Manual tests require visible browser
      },
    },
    {
      name: "hybrid",
      testMatch: /.*\.hybrid\.test\.ts$/,
      timeout: 0, // Hybrid tests have no timeout (contain manual steps)
      fullyParallel: false, // Hybrid tests run sequentially (one human tester)
      use: {
        headless: false, // Hybrid tests require visible browser for manual steps
      },
    },
    {
      name: "automated",
      testMatch: /.*\.auto\.test\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
