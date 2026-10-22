import { Project } from '@playwright/test'

import { defaultDevice } from './devices'

/**
 * Cyborg project configuration
 */
export const cyborgProject: Project = {
  name: 'cyborg',
  testMatch: /.*\.cyborg\.test\.ts$/,
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
  testMatch: /.*\.(auto|api|ui|e2e|bdd)\.test\.ts$/,
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
export const allProjects: Project[] = [cyborgProject, automatedProject]

/**
 * Get multiple projects by names
 * Supports mixing different project types (e.g., automated + cyborg)
 */
export function getProjectsByName(projectNames: string[]): Project[] {
  const uniqueProjects = new Set<Project>()

  for (const name of projectNames) {
    switch (name) {
      case 'automated':
        uniqueProjects.add(automatedProject)
        break
      case 'cyborg':
        uniqueProjects.add(cyborgProject)
        break
    }
  }

  return Array.from(uniqueProjects)
}
