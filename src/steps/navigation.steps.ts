import { Given, Then, When } from './bdd'

Given('user opens the home page', async ({ homePage }) => {
  await homePage.navigateToHome()
})

When('user clicks {string} button in header', async ({ homePage }, button: string) => {
  switch (button) {
    case 'Signup / Login':
      return homePage.clickSignupLoginBtn()
    case 'Home':
      return homePage.clickHomeBtn()
    default:
      throw new Error(`Unknown header button "${button}"`)
  }
})

Then('{string} form is visible', async ({ loginPage }, form: string) => {
  switch (form) {
    case 'Login to your account':
      return loginPage.expectLoginFormVisible()
    case 'New User Signup!':
      return loginPage.expectSignupFormVisible()
    default:
      throw new Error(`Unknown form "${form}"`)
  }
})

Then('home page is shown', async ({ homePage }) => {
  await homePage.expectOnHomePage()
})
