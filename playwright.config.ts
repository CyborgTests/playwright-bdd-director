import { defineConfig } from '@playwright/test'

import { allProjects, getProjectByName } from './src/config/projects'
import { tagToProject } from './src/config/tagToProject'
import { getProjectFromGrep } from './src/helpers/playwright-helpers'

const selectedProject = getProjectFromGrep(tagToProject)

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  reporter: [
    ['monocart-reporter', { outputFile: 'test-results/monocart-report/index.html' }],
    ['list']
  ],
  use: {
    baseURL: 'https://demo.playwright.dev/todomvc',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: selectedProject ? getProjectByName(selectedProject) : allProjects
})
