import { devices, type Project } from '@playwright/test'

export interface TestDevice {
  id: string // Playwright project name: npm run play e2e mobile
  name: string
  use: Project['use']
}

/**
 * Desktop browsers: every automated UI and E2E test runs on each
 */
export const desktopDevices: TestDevice[] = [
  { id: 'chrome', name: 'Desktop Chrome', use: devices['Desktop Chrome'] },
  { id: 'firefox', name: 'Desktop Firefox', use: devices['Desktop Firefox'] }
]

/**
 * Tablets and mobiles: only tests tagged @all-devices in the spec run on them as well
 */
export const handheldDevices: TestDevice[] = [
  { id: 'tablet', name: 'Tablet Chrome', use: devices['Galaxy Tab S9 landscape'] },
  { id: 'mobile', name: 'Mobile Chrome', use: devices['Galaxy S24'] }
]
