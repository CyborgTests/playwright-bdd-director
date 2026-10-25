import { Project } from '@playwright/test'

import { ALL_DEVICES_TAG, KIND_TAGS } from '@/framework/constants/tags'

import { desktopDevices, handheldDevices, type TestDevice } from './devices'

/** Tests carrying every tag, in any order; a tag ends at a space or the end (`@api` is not `@api-v2`) */
function withTags(...tags: string[]): RegExp {
  return new RegExp(tags.map((tag) => `(?=.*${tag}(\\s|$))`).join(''))
}

const API = '@api'

/**
 * A broken locator or a dead page fails its action, not the whole test timeout - that one is
 * multiplied by @slow, @timeout, retries and devices. Navigation gets more: the site slows down
 * under a full parallel run.
 */
const automated: Project = {
  timeout: 45000,
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  }
}

/**
 * Cyborg tests: generated tests with at least one step a person walks
 */
export const cyborgProject: Project = {
  name: 'cyborg',
  grep: withTags(KIND_TAGS.cyborg),
  timeout: 0,
  fullyParallel: false,
  // One person walks the tests: one browser and control panel at a time, other projects stay parallel
  workers: 1,
  // No device descriptor: the control panel opens with `viewport: null`, which a device's
  // deviceScaleFactor breaks - the test would fail before its first step
  use: {
    headless: false
  }
}

/**
 * Automated API tests: no browser, so once - not per device
 */
export const apiProject: Project = {
  ...automated,
  name: 'api',
  grep: withTags(KIND_TAGS.auto, API)
}

function deviceProject(device: TestDevice, tags: string[]): Project {
  return {
    ...automated,
    name: device.id,
    grep: withTags(KIND_TAGS.auto, ...tags),
    grepInvert: withTags(API),
    use: { ...device.use, ...automated.use }
  }
}

/**
 * Automated UI and E2E tests: every one on each desktop browser, @all-devices ones on tablets and
 * mobiles too. npm run play selects a device with its id (`npm run play e2e mobile`).
 */
export const deviceProjects: Project[] = [
  ...desktopDevices.map((device) => deviceProject(device, [])),
  ...handheldDevices.map((device) => deviceProject(device, [ALL_DEVICES_TAG]))
]

export const allProjects: Project[] = [cyborgProject, apiProject, ...deviceProjects]
