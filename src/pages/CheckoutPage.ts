import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export interface PaymentCard {
  name: string
  number: string
  cvc: string
  expiryMonth: string
  expiryYear: string
}

/** Checkout and payment: order review, comment, card form and the confirmation */
export class CheckoutPage extends BasePage {
  private readonly commentInput: Locator
  private readonly placeOrderBtn: Locator
  private readonly cardNameInput: Locator
  private readonly cardNumberInput: Locator
  private readonly cvcInput: Locator
  private readonly expiryMonthInput: Locator
  private readonly expiryYearInput: Locator
  private readonly payBtn: Locator
  private readonly orderPlacedMsg: Locator

  constructor(page: Page) {
    super(page, '/checkout')
    this.commentInput = this.page.locator('textarea[name="message"]')
    this.placeOrderBtn = this.page.getByRole('link', { name: 'Place Order' })
    this.cardNameInput = this.page.locator('[data-qa="name-on-card"]')
    this.cardNumberInput = this.page.locator('[data-qa="card-number"]')
    this.cvcInput = this.page.locator('[data-qa="cvc"]')
    this.expiryMonthInput = this.page.locator('[data-qa="expiry-month"]')
    this.expiryYearInput = this.page.locator('[data-qa="expiry-year"]')
    this.payBtn = this.page.locator('[data-qa="pay-button"]')
    this.orderPlacedMsg = this.page.locator('[data-qa="order-placed"]')
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentInput.fill(comment)
  }

  async clickPlaceOrder(): Promise<void> {
    await this.placeOrderBtn.click()
  }

  async payByCard(card: PaymentCard): Promise<void> {
    await this.cardNameInput.fill(card.name)
    await this.cardNumberInput.fill(card.number)
    await this.cvcInput.fill(card.cvc)
    await this.expiryMonthInput.fill(card.expiryMonth)
    await this.expiryYearInput.fill(card.expiryYear)
    await this.payBtn.click()
  }

  async expectOrderPlaced(): Promise<void> {
    await expect.soft(this.orderPlacedMsg).toHaveText('Order Placed!')
  }
}
