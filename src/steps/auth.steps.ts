import { Step } from './bdd'

// `/` separates alternatives in Cucumber Expressions - a literal one is escaped
Step('Navigate to and Verify "Signup\\/Login" Page', async ({ loginPage }) => {
  await loginPage.navigateToLogin()

  await loginPage.expectSignupFormVisible()
})

Step('Complete "New User Signup!" Form with valid User data', async ({ loginPage, testUser }) => {
  await loginPage.fillSignupForm(testUser.name, testUser.email)
  await loginPage.clickSignupBtn()
})

Step(
  'Complete Account Information and verify successful Account creation',
  async ({ signupPage, homePage, testUser }) => {
    await signupPage.registerUser(testUser)
    await signupPage.clickCreateAccountBtn()

    await homePage.expectAccountCreated()

    await homePage.clickContinue()

    await homePage.expectLoggedIn(testUser.name)
  }
)

Step(
  'Attempt Login with invalid Password and verify Error Message',
  async ({ loginPage, registeredUser, wrongPassword }) => {
    await loginPage.fillLoginForm(registeredUser.email, wrongPassword)
    await loginPage.clickLoginBtn()

    await loginPage.expectLoginError()
  }
)

Step(
  'Enter Password without Email and verify validation error',
  async ({ loginPage, wrongPassword }) => {
    await loginPage.fillLoginForm('', wrongPassword)
    await loginPage.clickLoginBtn()

    await loginPage.expectEmailInputInvalid()
  }
)

Step(
  'Enter valid login credentials and verify successful authentication',
  async ({ loginPage, homePage, registeredUser }) => {
    await loginPage.fillLoginForm(registeredUser.email, registeredUser.password)
    await loginPage.clickLoginBtn()

    await homePage.expectLoggedIn(registeredUser.name)
  }
)

Step(
  'Delete Account and verify Account removal',
  async ({ homePage, loginPage, registeredUser }) => {
    await homePage.clickDeleteAccountBtn()

    await homePage.expectAccountDeleted()

    await loginPage.navigateToLogin()
    await loginPage.fillLoginForm(registeredUser.email, registeredUser.password)
    await loginPage.clickLoginBtn()

    await loginPage.expectLoginError()
  }
)
