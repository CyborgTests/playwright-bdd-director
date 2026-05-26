import { faker } from '@faker-js/faker'

import { AuthClient } from '@/clients/AuthClient'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { TestUser } from '@/schemas/auth.types'

import { test as base } from './base.fixture'

/**
 * Auth-specific fixture interface
 * Extends BaseFixture with auth-related utilities
 */
interface AuthFixture {
  authClient: AuthClient
  testUser: TestUser
  authenticatedUser: {
    authClient: AuthClient
    homePage: HomePage
    loginPage: LoginPage
    testUser: TestUser
  }
  wrongPassword: string
}

/**
 * Generate test user with random data for auth tests
 */
function generateTestUser(): TestUser {
  return {
    name: faker.person.firstName(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12, memorable: true }),
    title: faker.helpers.arrayElement(['Mr', 'Mrs']),
    birth_day: faker.number.int({ min: 1, max: 31 }).toString(),
    birth_month: faker.date.month().slice(0, 3),
    birth_year: faker.number.int({ min: 1950, max: 2000 }).toString(),
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    address1: faker.location.streetAddress(),
    country: faker.helpers.arrayElement([
      'India',
      'United States',
      'Canada',
      'Australia',
      'Israel',
      'New Zealand',
      'Singapore'
    ]),
    state: faker.location.state(),
    city: faker.location.city(),
    zipcode: faker.location.zipCode(),
    mobile_number: faker.phone.number()
  }
}

/**
 * Auth test fixture extending base fixture
 * Provides auth-specific utilities: testUser, authClient, authenticatedUser, etc.
 */
export const test = base.extend<AuthFixture>({
  testUser: async ({}, use) => {
    const user = generateTestUser()
    await use(user)
  },

  wrongPassword: async ({}, use) => {
    const password = faker.internet.password({ length: 12, memorable: true })
    await use(password)
  },

  authClient: async ({ apiContext }, use) => {
    await use(new AuthClient(apiContext))
  },

  authenticatedUser: async ({ testUser, apiContext, homePage, loginPage }, use) => {
    const authClient = new AuthClient(apiContext)
    await authClient.register(testUser)

    try {
      await use({ testUser, authClient, homePage, loginPage })
    } finally {
      // Cleanup: ignore errors if account already deleted
      try {
        await authClient.deleteAccount(testUser.email, testUser.password)
      } catch {
        // Ignore — account may already be deleted by test
      }
    }
  }
})

export { expect } from '@playwright/test'
export type { TestUser }
