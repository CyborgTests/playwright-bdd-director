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
  testMatch: /.*\.(auto|api|ui|e2e)\.test\.ts$/,
  timeout: 45000,
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
 * Get multiple projects by names
 * Supports mixing different project types (e.g., automated + hybrid)
 */
export function getProjectsByName(projectNames: string[]): Project[] {
  const uniqueProjects = new Set<Project>()

  for (const name of projectNames) {
    switch (name) {
      case 'automated':
        uniqueProjects.add(automatedProject)
        break
      case 'manual':
        uniqueProjects.add(manualProject)
        break
      case 'hybrid':
        uniqueProjects.add(hybridProject)
        break
    }
  }

  return Array.from(uniqueProjects)
}
