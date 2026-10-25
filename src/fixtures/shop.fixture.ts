import { faker } from '@faker-js/faker'

import { ProductsClient } from '@/clients/ProductsClient'
import { type PaymentCard } from '@/pages/CheckoutPage'

import { test as base } from './base.fixture'

/**
 * Shop-specific fixture interface
 */
interface ShopFixture {
  paymentCard: PaymentCard // random card data - the example shop accepts any
  productsClient: ProductsClient
}

/**
 * Shop test fixture extending base fixture
 */
export const test = base.extend<ShopFixture>({
  productsClient: async ({ apiContext }, use) => {
    await use(new ProductsClient(apiContext))
  },

  paymentCard: async ({}, use) => {
    const expiry = faker.date.future({ years: 3 })
    await use({
      name: faker.person.fullName(),
      number: faker.finance.creditCardNumber('visa'),
      cvc: faker.finance.creditCardCVV(),
      expiryMonth: String(expiry.getMonth() + 1).padStart(2, '0'),
      expiryYear: String(expiry.getFullYear())
    })
  }
})
