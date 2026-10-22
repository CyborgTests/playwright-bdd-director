import '@/steps/navigation.steps'

import { test } from '@/fixtures/base.fixture'
import { runStep } from '@/framework/bdd'
import { TAG } from '@/test-constants/tags'

test.describe(
  '[CYBORG] Header Navigation With Step Definitions',
  { tag: [TAG.TEST.CYBORG, TAG.SUITE.HEADER_NAVIGATION] },
  () => {
    test.beforeEach('Background', async ({ homePage }) => {
      await runStep('Given user opens the home page', { homePage })
    })

    for (const example of [{ form: 'Login to your account' }, { form: 'New User Signup!' }]) {
      test(`See "${example.form}" form on "Signup / Login" page`, async ({
        homePage,
        manualStep
      }) => {
        await runStep('When user clicks "Signup / Login" button in header', { homePage })
        await manualStep(`Then "${example.form}" form is visible`)
      })
    }

    test('Go back home from "Signup / Login" page', async ({ homePage, manualStep }) => {
      await runStep('Given user clicks "Signup / Login" button in header', { homePage })
      await runStep('When user clicks "Home" button in header', { homePage })
      await manualStep('Then home page is shown')
    })
  }
)
