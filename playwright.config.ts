import { defineConfig } from '@playwright/test'

import { allProjects, getProjectByName } from '@/config/projects'
import { tagToProject } from '@/config/tagToProject'
import { getProjectFromGrep } from '@/helpers/playwright-helpers'

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
    screenshot: 'only-on-failure'
  },

  projects: selectedProject ? getProjectByName(selectedProject) : allProjects
})
