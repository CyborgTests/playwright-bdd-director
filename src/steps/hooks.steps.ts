import { test } from '@playwright/test'

import { After } from './bdd'

/**
 * Where the flow stopped, readable in the report without opening the trace
 * (screenshot, trace and video on failure come from the Playwright config)
 */
After({ name: 'Attach page URL on failure' }, async ({ page }) => {
  const info = test.info()
  if (info.status === info.expectedStatus) return
  await info.attach('page-url', { body: page.url(), contentType: 'text/plain' })
})
