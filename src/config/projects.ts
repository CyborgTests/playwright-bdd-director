import { Project } from '@playwright/test'

import { defaultDevice } from './devices'

/**
 * Manual project configuration
 */
export const manualProject: Project = {
  name: 'manual',
  testMatch: /.*\.manual\.test\.ts$/,
  timeout: 0,
  fullyParallel: false,
  use: {
    headless: false
  }
}

/**
 * Hybrid project configuration
 */
export const hybridProject: Project = {
  name: 'hybrid',
  testMatch: /.*\.hybrid\.test\.ts$/,
  timeout: 0,
  fullyParallel: false,
  use: {
    headless: false
  }
}

/**
 * Automated project configuration
 */
export const automatedProject: Project = {
  name: 'automated',
  testMatch: /.*\.auto\.test\.ts$/,
  use: {
    ...defaultDevice,
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  }
}

/**
 * All available projects
 */
export const allProjects: Project[] = [manualProject, hybridProject, automatedProject]

/**
 * Get project by name
 */
export function getProjectByName(projectName: string): Project[] {
  switch (projectName) {
    case 'automated':
      return [automatedProject]
    case 'manual':
      return [manualProject]
    case 'hybrid':
      return [hybridProject]
    default:
      return allProjects
  }
}
