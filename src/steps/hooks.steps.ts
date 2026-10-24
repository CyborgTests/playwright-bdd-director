import { ProductsClient } from '@/clients/ProductsClient'

import { AfterStep, Before, BeforeAll } from './bdd'

/**
 * Fail fast when the catalog the cart suite shops from is down - once per worker, before any
 * browser opens (BeforeAll gets worker fixtures only)
 */
BeforeAll({ name: 'Check product catalog', tags: '@cart' }, async ({ playwright }) => {
  const apiContext = await playwright.request.newContext()
  const productsClient = new ProductsClient(apiContext)

  await productsClient.expectProductsListed(await productsClient.getProductsList())

  await apiContext.dispose()
})

/**
 * `@logged-in` tests start with a fresh user (registered through the API, deleted after the test)
 * logged in through the UI
 */
Before({ name: 'Log in', tags: '@logged-in' }, async ({ loginPage, homePage, registeredUser }) => {
  await loginPage.navigateToLogin()
  await loginPage.fillLoginForm(registeredUser.email, registeredUser.password)
  await loginPage.clickLoginBtn()

  await homePage.expectLoggedIn(registeredUser.name)
})

/**
 * Where the flow stopped, under the failed step in the report, without opening the trace
 * (screenshot, trace and video on failure come from the Playwright config)
 */
AfterStep({ name: 'Attach page URL on failure', tags: 'not @api' }, async ({ page, bdd }) => {
  if (!bdd.step?.error) return
  await bdd.step.attach('page-url', { body: page.url(), contentType: 'text/plain' })
})
