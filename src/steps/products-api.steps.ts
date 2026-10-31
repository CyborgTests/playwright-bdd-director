import './parameter-types.steps'

import { Step } from './bdd'

export const verifyProductListed = Step(
  'Verify Products List contains {string} for {price}',
  async ({ productsClient }, product: string, amount: number) => {
    const response = await productsClient.getProductsList()

    await productsClient.expectProductListed(response, product, `Rs. ${amount}`)
  }
)

Step('Verify POST to Products List is rejected as unsupported', async ({ productsClient }) => {
  const response = await productsClient.postProductsList()

  await productsClient.expectMethodNotSupported(response)
})

Step(
  'Search Products for {string} and verify {string} is found',
  async ({ productsClient }, query: string, product: string) => {
    const response = await productsClient.searchProduct(query)

    await productsClient.expectSearchFound(response, product)
  }
)
