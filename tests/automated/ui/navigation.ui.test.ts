import { test } from '@/fixtures/base.fixture'
import { TAG } from '@/test-constants/tags'

test.describe(
  '[UI] Site Navigation',
  { tag: [TAG.TEST.AUTO, TAG.TYPE.UI, TAG.SUITE.NAVIGATION] },
  () => {
    test.beforeEach('Background', async ({ homePage }) => {
      await test.step('Open Home Page', async () => {
        await homePage.navigateToHome()
      })
    })

    test(
      'Open "Signup / Login" Page from Header',
      { tag: ['@smoke'] },
      async ({ homePage, loginPage }) => {
        await test.step('Click "Signup / Login" Button in Header', async () => {
          await homePage.clickSignupLoginBtn()
        })

        await test.step('Verify "Login to your account" Form is visible', async () => {
          await loginPage.expectLoginFormVisible()
        })

        await test.step('Verify "New User Signup!" Form is visible', async () => {
          await loginPage.expectSignupFormVisible()
        })
      }
    )

    test('Return to Home Page from "Signup / Login" Page', async ({ homePage }) => {
      await test.step('Click "Signup / Login" Button in Header', async () => {
        await homePage.clickSignupLoginBtn()
        await homePage.expectOnLoginPage()
      })

      await test.step('Click "Home" Button in Header', async () => {
        await homePage.clickHomeBtn()
      })

      await test.step('Verify Home Page is shown', async () => {
        await homePage.expectOnHomePage()
      })
    })
  }
)
