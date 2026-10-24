import { Given, Step, Then, When } from './bdd'

const openHomePage = Given('user opens the home page', async ({ homePage }) => {
  await homePage.navigateToHome()
})

const clickHeaderButton = When(
  'user clicks {string} button in header',
  async ({ homePage }, button: string) => {
    switch (button) {
      case 'Signup / Login':
        return homePage.clickSignupLoginBtn()
      case 'Home':
        return homePage.clickHomeBtn()
      default:
        throw new Error(`Unknown header button "${button}"`)
    }
  }
)

const expectFormVisible = Then('{string} form is visible', async ({ loginPage }, form: string) => {
  switch (form) {
    case 'Login to your account':
      return loginPage.expectLoginFormVisible()
    case 'New User Signup!':
      return loginPage.expectSignupFormVisible()
    default:
      throw new Error(`Unknown form "${form}"`)
  }
})

const expectHomePage = Then('home page is shown', async ({ homePage }) => {
  await homePage.expectOnHomePage()
})

// navigation.md words the same steps its own way - one implementation serves both specs
Step('Open Home Page', openHomePage)
Step('Click {string} Button in Header', clickHeaderButton)
Step('Verify {string} Form is visible', expectFormVisible)
Step('Verify Home Page is shown', expectHomePage)
