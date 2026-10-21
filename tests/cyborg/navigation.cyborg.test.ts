import test from '@cyborgtests/test'

import { TAG } from '@/test-constants/tags'

test.describe('[CYBORG] Site Navigation', { tag: [TAG.TEST.CYBORG, TAG.SUITE.NAVIGATION] }, () => {
  test.beforeEach('Background', async ({ manualStep }) => {
    await manualStep('Given user opens the home page')
  })

  test('Open "Signup / Login" page from header', async ({ manualStep }) => {
    await manualStep('When user clicks "Signup / Login" button in header')
    await manualStep('Then "Login to your account" form is visible')
    await manualStep('And "New User Signup!" form is visible')
  })

  test('Return to home page from "Signup / Login" page', async ({ manualStep }) => {
    await manualStep('Given user clicks "Signup / Login" button in header')
    await manualStep('When user clicks "Home" button in header')
    await manualStep('Then home page is shown')
  })
})
