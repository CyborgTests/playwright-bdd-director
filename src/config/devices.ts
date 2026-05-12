import { devices as playwrightDevices } from '@playwright/test'

/**
 * Desktop Chrome device configuration
 */
export const desktopChrome = {
  ...playwrightDevices['Desktop Chrome']
}

/**
 * Desktop Firefox device configuration
 */
export const desktopFirefox = {
  ...playwrightDevices['Desktop Firefox']
}

/**
 * Desktop Safari device configuration
 */
export const desktopSafari = {
  ...playwrightDevices['Desktop Safari']
}

/**
 * Mobile Chrome device configuration
 */
export const mobileChrome = {
  ...playwrightDevices['Pixel 5']
}

/**
 * Mobile Safari device configuration
 */
export const mobileSafari = {
  ...playwrightDevices['iPhone 13']
}

/**
 * Default device for automated tests
 */
export const defaultDevice = desktopChrome
