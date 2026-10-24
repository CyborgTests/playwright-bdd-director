import { type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export class ProductDetailsPage extends BasePage {
  private readonly quantityInput: Locator
  private readonly addToCartBtn: Locator

  constructor(page: Page) {
    super(page, '/product_details')
    this.quantityInput = this.page.locator('#quantity')
    this.addToCartBtn = this.page
      .locator('.product-information')
      .getByRole('button', { name: 'Add to cart' })
  }

  async addToCart(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity))
    await this.addToCartBtn.click()
    await this.continueShopping()
  }
}
