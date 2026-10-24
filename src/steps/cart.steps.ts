import { type DataTable, defineParameterType } from '@/framework/bdd'

import { Given, Then, When } from './bdd'

// "Rs. 1500" in a step is an amount: steps get the number, the shop format stays in one place
defineParameterType({
  name: 'price',
  regexp: /Rs\. \d+/,
  transformer: (text: string) => Number(text.slice('Rs. '.length))
})

const addToCart = When('user adds {string} to cart', async ({ productsPage }, product: string) => {
  await productsPage.addToCart(product)
})

const openCart = When('user opens the cart', async ({ cartPage }) => {
  await cartPage.navigateToCart()
})

Then('cart has:', async ({ cartPage }, table: DataTable) => {
  for (const { name, price, quantity, total } of table.hashes()) {
    await cartPage.expectItem({ name, price, quantity, total })
  }
})

When(
  'user adds {int} of {string} from its product page',
  async ({ productsPage, productDetailsPage }, quantity: number, product: string) => {
    await productsPage.openProduct(product)
    await productDetailsPage.addToCart(quantity)
  }
)

Then(
  'cart total for {string} is {price}',
  async ({ cartPage }, product: string, amount: number) => {
    await cartPage.expectTotal(product, amount)
  }
)

// One step made of others: each gets only the fixtures it uses
Given('cart has {string}', async ({ productsPage, cartPage }, product: string) => {
  await addToCart({ productsPage }, product)
  await openCart({ cartPage })

  await cartPage.expectInCart(product)
})

When('user removes {string} from cart', async ({ cartPage }, product: string) => {
  await cartPage.removeProduct(product)
})

Then('cart is empty', async ({ cartPage }) => {
  await cartPage.navigateToCart()

  await cartPage.expectEmpty()
})

When('user places the order with comment:', async ({ cartPage, checkoutPage }, comment: string) => {
  await cartPage.clickProceedToCheckout()
  await checkoutPage.fillComment(comment)
  await checkoutPage.clickPlaceOrder()
})

When('user pays by card', async ({ checkoutPage, paymentCard }) => {
  await checkoutPage.payByCard(paymentCard)
})

Then('order is confirmed', async ({ checkoutPage }) => {
  await checkoutPage.expectOrderPlaced()
})

// Skeletons from `npm run steps cart`: the invoice is a file a person opens and reads (cyborg test)
When('user downloads the invoice', async ({}) => {
  // TODO: implement step
})

Then('invoice shows total amount {price}', async ({}, _amount: number) => {
  // TODO: implement step
})
