import { Step } from './bdd'

Step('Open Home Page', async ({ homePage }) => {
  await homePage.navigateToHome()
})

Step('Click {string} Button in Header', async ({ homePage }, button: string) => {
  switch (button) {
    case 'Signup / Login':
      return homePage.clickSignupLoginBtn()
    case 'Home':
      return homePage.clickHomeBtn()
    default:
      throw new Error(`Unknown header button "${button}"`)
  }
})

Step('Verify {string} Form is visible', async ({ loginPage }, form: string) => {
  switch (form) {
    case 'Login to your account':
      return loginPage.expectLoginFormVisible()
    case 'New User Signup!':
      return loginPage.expectSignupFormVisible()
    default:
      throw new Error(`Unknown form "${form}"`)
  }
})

Step('Verify Home Page is shown', async ({ homePage }) => {
  await homePage.expectOnHomePage()
})

Step('Click {string} Brand in Sidebar', async ({ homePage }, brand: string) => {
  await homePage.clickBrand(brand)
})

Step('Verify {string} Heading is visible', async ({ homePage }, heading: string) => {
  await homePage.expectHeadingVisible(heading)
})

// Skeletons from `npm run steps navigation`: without code their steps stay manual (cyborg test)
Step('Scroll down to Footer', async ({}) => {
  // TODO: implement step
})

Step('Enter Email Address and click Arrow Button', async ({}) => {
  // TODO: implement step
})

Step('Verify {string} Message is visible', async ({}, _string: string) => {
  // TODO: implement step
})
