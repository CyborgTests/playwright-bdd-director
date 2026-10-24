import test from '@cyborgtests/test'

import { TAG } from '@/test-constants/tags'

test.describe('[CYBORG] Site Navigation', { tag: [TAG.TEST.CYBORG, TAG.SUITE.NAVIGATION] }, () => {
  test.beforeEach('Background', async ({ manualStep }) => {
    await manualStep('Open Home Page')
  })

  test('Open "Signup / Login" Page from Header', { tag: ['@smoke'] }, async ({ manualStep }) => {
    await manualStep('Click "Signup / Login" Button in Header')
    await manualStep('Verify "Login to your account" Form is visible')
    await manualStep('Verify "New User Signup!" Form is visible')
  })

  test('Return to Home Page from "Signup / Login" Page', async ({ manualStep }) => {
    await manualStep('Click "Signup / Login" Button in Header')
    await manualStep('Click "Home" Button in Header')
    await manualStep('Verify Home Page is shown')
  })
})
