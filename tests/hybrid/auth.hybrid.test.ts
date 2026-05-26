import { test } from '@/fixtures/auth.fixture'
import { TAG } from '@/test-constants/tags'

test.describe('[HYBRID] Authentication Tests', { tag: [TAG.TEST.HYBRID, TAG.SUITE.AUTH] }, () => {
  test('User Registration', async ({ loginPage, signupPage, manualStep, testUser, authClient }) => {
    try {
      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        await loginPage.navigateToLogin()

        await manualStep('Verify "Signup/Login" Page is visible')
      })

      await test.step('Complete "New User Signup!" Form with valid User data', async () => {
        await loginPage.fillSignupForm(testUser.name, testUser.email)
        await loginPage.clickSignupBtn()
      })

      await test.step('Complete Account Information and verify successful Account creation', async () => {
        await signupPage.registerUser(testUser)
        await signupPage.clickCreateAccountBtn()

        await manualStep('Verify "Account Created Successfully!" Message appears')
      })
    } finally {
      await authClient.deleteAccount(testUser.email, testUser.password)
    }
  })

  test('Login With Wrong Password', async ({ authenticatedUser, manualStep, wrongPassword }) => {
    const { loginPage, testUser } = authenticatedUser

    await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
      await loginPage.navigateToLogin()

      await manualStep('Verify "Signup/Login" Page is visible')
    })

    await test.step('Attempt Login with invalid Password and verify Error Message', async () => {
      await loginPage.fillLoginForm(testUser.email, wrongPassword)
      await loginPage.clickLoginBtn()

      await manualStep('Verify "Invalid Email or Password!" Error Message appears')
    })
  })

  test('Verify Login Without Email', async ({ loginPage, manualStep, wrongPassword }) => {
    await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
      await loginPage.navigateToLogin()

      await manualStep('Verify "Signup/Login" Page is visible')
    })

    await test.step('Enter Password without Email and verify validation error', async () => {
      await loginPage.fillLoginForm('', wrongPassword)
      await loginPage.clickLoginBtn()

      await manualStep('Verify validation error appears')
    })
  })

  test('User Login', async ({ authenticatedUser, manualStep }) => {
    const { loginPage, testUser } = authenticatedUser

    await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
      await loginPage.navigateToLogin()

      await manualStep('Verify "Signup/Login" Page is visible')
    })

    await test.step('Enter valid login credentials and verify successful authentication', async () => {
      await loginPage.fillLoginForm(testUser.email, testUser.password)
      await loginPage.clickLoginBtn()

      await manualStep('Verify "Logged in as [user name]" Message appears in header')
    })
  })

  test('Delete User Account', async ({ authenticatedUser, manualStep }) => {
    const { homePage, loginPage, testUser } = authenticatedUser

    await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
      await loginPage.navigateToLogin()

      await manualStep('Verify "Signup/Login" Page is visible')
    })

    await test.step('Enter valid login credentials and verify successful authentication', async () => {
      await loginPage.fillLoginForm(testUser.email, testUser.password)
      await loginPage.clickLoginBtn()

      await manualStep('Verify "Logged in as [user name]" Message appears in header')
    })

    await test.step('Delete Account and verify Account removal', async () => {
      await homePage.clickDeleteAccountBtn()

      await manualStep('Verify Account deletion confirmation Message is displayed')

      await loginPage.navigateToLogin()
      await loginPage.fillLoginForm(testUser.email, testUser.password)
      await loginPage.clickLoginBtn()

      await manualStep('Verify Login fails with deleted credentials')
    })
  })
})
