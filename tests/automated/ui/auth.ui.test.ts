import { test } from '@/fixtures/auth.fixture'
import { TAG } from '@/test-constants/tags'

test.describe(
  '[UI] Authentication Tests',
  { tag: [TAG.TEST.AUTO, TAG.TYPE.UI, TAG.SUITE.AUTH] },
  () => {
    test('User Registration', async ({ homePage, loginPage, signupPage, testUser, authClient }) => {
      try {
        await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
          await loginPage.navigateToLogin()

          await loginPage.expectSignupFormVisible()
        })

        await test.step('Complete "New User Signup!" Form with valid User data', async () => {
          await loginPage.fillSignupForm(testUser.name, testUser.email)
          await loginPage.clickSignupBtn()
        })

        await test.step('Complete Account Information and verify successful Account creation', async () => {
          await signupPage.registerUser(testUser)
          await signupPage.clickCreateAccountBtn()

          await homePage.expectAccountCreated()

          await homePage.clickContinue()

          await homePage.expectLoggedIn(testUser.name)
        })
      } finally {
        await authClient.deleteAccount(testUser.email, testUser.password)
      }
    })

    test('Login With Wrong Password', async ({ authenticatedUser, wrongPassword }) => {
      const { loginPage, testUser } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        await loginPage.navigateToLogin()

        await loginPage.expectSignupFormVisible()
      })

      await test.step('Attempt Login with invalid Password and verify Error Message', async () => {
        await loginPage.fillLoginForm(testUser.email, wrongPassword)
        await loginPage.clickLoginBtn()

        await loginPage.expectLoginError()
      })
    })

    test('Verify Login Without Email', async ({ loginPage, wrongPassword }) => {
      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        await loginPage.navigateToLogin()

        await loginPage.expectSignupFormVisible()
      })

      await test.step('Enter Password without Email and verify validation error', async () => {
        await loginPage.fillLoginForm('', wrongPassword)
        await loginPage.clickLoginBtn()

        await loginPage.expectEmailInputInvalid()
      })
    })

    test('User Login', async ({ authenticatedUser }) => {
      const { homePage, loginPage, testUser } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        await loginPage.navigateToLogin()

        await loginPage.expectSignupFormVisible()
      })

      await test.step('Enter valid login credentials and verify successful authentication', async () => {
        await loginPage.fillLoginForm(testUser.email, testUser.password)
        await loginPage.clickLoginBtn()

        await homePage.expectLoggedIn(testUser.name)
      })
    })

    test('Delete User Account', async ({ authenticatedUser }) => {
      const { homePage, loginPage, testUser } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        await loginPage.navigateToLogin()

        await loginPage.expectSignupFormVisible()
      })

      await test.step('Enter valid login credentials and verify successful authentication', async () => {
        await loginPage.fillLoginForm(testUser.email, testUser.password)
        await loginPage.clickLoginBtn()

        await homePage.expectLoggedIn(testUser.name)
      })

      await test.step('Delete Account and verify Account removal', async () => {
        await homePage.clickDeleteAccountBtn()

        await homePage.expectAccountDeleted()

        await loginPage.navigateToLogin()
        await loginPage.fillLoginForm(testUser.email, testUser.password)
        await loginPage.clickLoginBtn()

        await loginPage.expectLoginError()
      })
    })
  }
)
