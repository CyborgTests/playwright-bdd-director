import './parameter-types.steps'

import { Given, Then } from './bdd'
import { verifyProductListed } from './products-api.steps'

// The API suite's step under the wording of the e2e scenario: one implementation, two specs
Given('catalog API lists {string} for {price}', verifyProductListed)

Then(
  'products page shows {string} for {price}',
  async ({ productsPage }, product: string, amount: number) => {
    await productsPage.expectProductPrice(product, `Rs. ${amount}`)
  }
)
