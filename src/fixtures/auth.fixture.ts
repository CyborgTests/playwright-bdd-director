import { faker } from '@faker-js/faker'

import { AuthClient } from '@/clients/AuthClient'
import { TestUser } from '@/schemas/auth.types'

import { test as base } from './base.fixture'

/**
 * Auth-specific fixture interface
 * Extends BaseFixture with auth-related utilities
 */
interface AuthFixture {
  authClient: AuthClient
  testUser: TestUser // fresh user data; its account is deleted after the test if one was created
  registeredUser: TestUser // testUser with an account registered through the API
  wrongPassword: string
}

/**
 * Generate test user with random data for auth tests
 */
function generateTestUser(): TestUser {
  return {
    name: faker.person.firstName(),
    // The demo site is shared: plain faker emails repeat across its users, a UUID does not
    email: `${faker.string.uuid()}@example.com`,
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
 * Provides auth-specific utilities: testUser, registeredUser, authClient, wrongPassword
 */
export const test = base.extend<AuthFixture>({
  testUser: async ({ apiContext }, use) => {
    const user = generateTestUser()
    await use(user)
    // Cleanup: registration steps or registeredUser may have created the account; ignore when none
    await new AuthClient(apiContext).deleteAccount(user.email, user.password).catch(() => {})
  },

  registeredUser: async ({ testUser, authClient }, use) => {
    await authClient.expectRegistered(await authClient.register(testUser))
    await use(testUser)
  },

  wrongPassword: async ({}, use) => {
    const password = faker.internet.password({ length: 12, memorable: true })
    await use(password)
  },

  authClient: async ({ apiContext }, use) => {
    await use(new AuthClient(apiContext))
  }
})
