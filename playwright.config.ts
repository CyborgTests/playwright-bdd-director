import { defineConfig } from '@playwright/test'

import { allProjects } from '@/config/projects'
import { prepareTests } from '@/framework/bdd/prepare'
import { CONFIG } from '@/framework/config'

// Tests are generated from the specs and step definitions on every run - nothing to keep in sync
prepareTests()

export default defineConfig({
  testDir: CONFIG.paths.generatedTests,
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  reporter: [
    ['monocart-reporter', { outputFile: 'test-results/monocart-report/index.html' }],
    ['list'],
    // Test management tools (Xray, Zephyr, TestRail, CI): spec-structured Cucumber JSON, JUnit XML
    ['./src/framework/reporting/cucumber-reporter.ts'],
    ['junit', { outputFile: CONFIG.paths.junitReport }],
    // Latest result per test and device for the coverage matrix (npm run matrix)
    ['./src/framework/reporting/last-run-reporter.ts']
  ],
  use: {
    baseURL: 'https://www.automationexercise.com',
    screenshot: 'only-on-failure'
  },

  // Each project picks its tests by tags - api, cyborg, one per device (src/config/projects.ts)
  projects: allProjects
})
