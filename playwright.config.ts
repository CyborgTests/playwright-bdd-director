import { defineConfig } from '@playwright/test'

import { allProjects, getProjectsByName } from '@/config/projects'
import { tagToProject } from '@/config/tagToProject'
import { CONFIG } from '@/framework/config'
import { getProjectsFromGrep } from '@/test-helpers/playwright.helpers'

const selectedProjects = getProjectsFromGrep(tagToProject)

export default defineConfig({
  testDir: './tests',
  testIgnore: ['tests/automated/todo/**'],
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
