import { Project } from '@playwright/test'

import { defaultDevice } from './devices'

/**
 * Cyborg tests: generated tests with at least one step a person walks
 */
export const cyborgProject: Project = {
  name: 'cyborg',
  grep: /@cyborg/,
  timeout: 0,
  fullyParallel: false,
  // One person walks the tests: one browser and control panel at a time, other projects stay parallel
  workers: 1,
  use: {
    headless: false
  }
}

/**
 * Automated tests: generated tests whose every step has a step definition
 */
export const automatedProject: Project = {
  name: 'automated',
  grep: /@auto/,
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
