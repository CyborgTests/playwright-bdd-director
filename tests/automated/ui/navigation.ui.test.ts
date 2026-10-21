import { test } from '@/fixtures/base.fixture'
import { TAG } from '@/test-constants/tags'

test.describe(
  '[UI] Site Navigation',
  { tag: [TAG.TEST.AUTO, TAG.TYPE.UI, TAG.SUITE.NAVIGATION] },
  () => {
    test.beforeEach('Background', async ({ homePage }) => {
      await test.step('Given user opens the home page', async () => {
        await homePage.navigateToHome()
      })
    })

    test(
      'Open "Signup / Login" page from header',
      { tag: ['@smoke'] },
      async ({ homePage, loginPage }) => {
        await test.step('When user clicks "Signup / Login" button in header', async () => {
          await homePage.clickSignupLoginBtn()
        })

        await test.step('Then "Login to your account" form is visible', async () => {
          await loginPage.expectLoginFormVisible()
        })

        await test.step('And "New User Signup!" form is visible', async () => {
          await loginPage.expectSignupFormVisible()
        })
      }
    )

    test('Return to home page from "Signup / Login" page', async ({ homePage }) => {
      await test.step('Given user clicks "Signup / Login" button in header', async () => {
        await homePage.clickSignupLoginBtn()
        await homePage.expectOnLoginPage()
      })

      await test.step('When user clicks "Home" button in header', async () => {
        await homePage.clickHomeBtn()
      })

      await test.step('Then home page is shown', async () => {
        await homePage.expectOnHomePage()
      })
    })
  }
)
