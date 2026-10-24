import { defineConfig } from '@playwright/test'

import { allProjects, getProjectsByName } from '@/config/projects'
import { tagToProject } from '@/config/tagToProject'
import { prepareTests } from '@/framework/bdd/prepare'
import { CONFIG } from '@/framework/config'
import { getProjectsFromGrep } from '@/test-helpers/playwright.helpers'

// Tests are generated from the specs and step definitions on every run - nothing to keep in sync
prepareTests()

const selectedProjects = getProjectsFromGrep(tagToProject)

export default defineConfig({
  testDir: CONFIG.paths.generatedTests,
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  reporter: [
    ['monocart-reporter', { outputFile: 'test-results/monocart-report/index.html' }],
    ['list'],
    // Test management tools (Xray, Zephyr, TestRail, CI): spec-structured Cucumber JSON, JUnit XML
    ['./src/framework/reporting/cucumber-reporter.ts'],
    ['junit', { outputFile: CONFIG.paths.junitReport }]
  ],
  use: {
    baseURL: 'https://www.automationexercise.com',
    screenshot: 'only-on-failure'
  },

  projects: selectedProjects.length > 0 ? getProjectsByName(selectedProjects) : allProjects
})
