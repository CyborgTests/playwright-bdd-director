import test from '@cyborgtests/test'

import { TAG } from '@/test-constants/tags'

test.describe(
  '[CYBORG] Header Navigation With Step Definitions',
  { tag: [TAG.TEST.CYBORG, TAG.SUITE.HEADER_NAVIGATION] },
  () => {
    test.beforeEach('Background', async ({ manualStep }) => {
      await manualStep('Given user opens the home page')
    })

    for (const example of [{ form: 'Login to your account' }, { form: 'New User Signup!' }]) {
      test(`See "${example.form}" form on "Signup / Login" page`, async ({ manualStep }) => {
        await manualStep('When user clicks "Signup / Login" button in header')
        await manualStep(`Then "${example.form}" form is visible`)
      })
    }

    test('Go back home from "Signup / Login" page', async ({ manualStep }) => {
      await manualStep('Given user clicks "Signup / Login" button in header')
      await manualStep('When user clicks "Home" button in header')
      await manualStep('Then home page is shown')
    })
  }
)
