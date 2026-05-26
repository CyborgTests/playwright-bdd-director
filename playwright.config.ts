import { defineConfig } from '@playwright/test'

import { allProjects, getProjectsByName } from '@/config/projects'
import { tagToProject } from '@/config/tagToProject'
import { getProjectsFromGrep } from '@/test-helpers/playwright.helpers'

const selectedProjects = getProjectsFromGrep(tagToProject)

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  reporter: [
    ['monocart-reporter', { outputFile: 'test-results/monocart-report/index.html' }],
    ['list']
  ],
  use: {
    baseURL: 'https://www.automationexercise.com',
    screenshot: 'only-on-failure'
  },

  projects: selectedProjects.length > 0 ? getProjectsByName(selectedProjects) : allProjects
})
