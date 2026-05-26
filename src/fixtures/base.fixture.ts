import cyborgTest from '@cyborgtests/test'
import { APIRequestContext, Page, request } from '@playwright/test'

import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'

/**
 * Base fixture interface with common utilities for all test suites
 */
export interface BaseFixture {
  page: Page
  apiContext: APIRequestContext
  homePage: HomePage
  loginPage: LoginPage
  signupPage: SignupPage
  manualStep: (description: string) => Promise<void>
  request: {
    newContext: () => Promise<APIRequestContext>
  }
}

/**
 * Base test fixture with common page objects and API context
 * Extend this fixture for suite-specific fixtures
 */
const adDomains = [
  '**/googlesyndication.com/**',
  '**/doubleclick.net/**',
  '**/googleadservices.com/**',
  '**/google-analytics.com/**',
  '**/googletagmanager.com/**',
  '**/googleads.g.doubleclick.net/**',
  '**/pagead2.googlesyndication.com/**'
]

export const test = cyborgTest.extend<BaseFixture>({
  page: async ({ page }, use) => {
    for (const pattern of adDomains) {
      await page.route(pattern, (route) => route.abort())
    }
    await page.addInitScript(`
      new MutationObserver(() => {
        document.querySelectorAll('a[href*="google_vignette"]').forEach((el) => {
          el.setAttribute('href', el.href.split('#')[0])
        })
      }).observe(document, { subtree: true, childList: true, attributes: true })
    `)
    await use(page)
  },

  apiContext: async ({}, use) => {
    const context = await request.newContext()
    await use(context)
    await context.dispose()
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page))
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },

  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page))
  }
})

export { expect } from '@playwright/test'
