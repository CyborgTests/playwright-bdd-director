import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export interface CartItem {
  name: string
  price: string
  quantity: string
  total: string
}

export class CartPage extends BasePage {
  private readonly cartRows: Locator
  private readonly emptyCartMsg: Locator
  private readonly proceedToCheckoutBtn: Locator

  constructor(page: Page) {
    super(page, '/view_cart')
    this.cartRows = this.page.locator('#cart_info_table tbody tr')
    this.emptyCartMsg = this.page.locator('#empty_cart')
    // A link without href - no link role
    this.proceedToCheckoutBtn = this.page.locator('.check_out', { hasText: 'Proceed To Checkout' })
  }

  private rowByName(name: string): Locator {
    return this.cartRows.filter({ has: this.page.getByRole('link', { name, exact: true }) })
  }

  async navigateToCart(): Promise<void> {
    await this.goto()
  }

  async removeProduct(name: string): Promise<void> {
    await this.rowByName(name).locator('.cart_quantity_delete').click()
    // Removal is an XHR - the row goes once the server has dropped the product
    await expect(this.rowByName(name)).toBeHidden()
  }

  async clickProceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutBtn.click()
  }

  async expectInCart(name: string): Promise<void> {
    await expect.soft(this.rowByName(name)).toBeVisible()
  }

  async expectItem({ name, price, quantity, total }: CartItem): Promise<void> {
    const row = this.rowByName(name)
    await expect.soft(row.locator('.cart_price')).toHaveText(price)
    await expect.soft(row.locator('.cart_quantity')).toHaveText(quantity)
    await expect.soft(row.locator('.cart_total')).toHaveText(total)
  }

  async expectTotal(name: string, amount: number): Promise<void> {
    await expect.soft(this.rowByName(name).locator('.cart_total')).toHaveText(`Rs. ${amount}`)
  }

  async expectEmpty(): Promise<void> {
    await expect.soft(this.emptyCartMsg).toBeVisible()
    await expect.soft(this.cartRows).toHaveCount(0)
  }
}
