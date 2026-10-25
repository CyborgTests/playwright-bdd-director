import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  private readonly homeBtn: Locator
  private readonly signupLoginBtn: Locator
  private readonly deleteAccountBtn: Locator
  private readonly continueBtn: Locator
  private readonly loggedInHeader: Locator
  private readonly accountCreatedMsg: Locator
  private readonly accountDeletedMsg: Locator
  private readonly brandsSidebar: Locator

  constructor(page: Page) {
    super(page, '/')
    // Logo links to "/" too, so match the header menu item by its name
    this.homeBtn = this.page.getByRole('banner').getByRole('link', { name: 'Home' })
    this.signupLoginBtn = this.page.locator('a[href="/login"]')
    this.loggedInHeader = this.page.locator('li a', { hasText: 'Logged in as' })
    this.deleteAccountBtn = this.page.locator('a[href="/delete_account"]')
    this.continueBtn = this.page.locator('[data-qa="continue-button"]')
    this.accountCreatedMsg = this.page.locator('[data-qa="account-created"]')
    this.accountDeletedMsg = this.page.locator('[data-qa="account-deleted"]')
    this.brandsSidebar = this.page.locator('.brands-name')
  }

  // Link names carry the product count ("(6)Polo") - the href holds the brand alone
  private brandLink(brand: string): Locator {
    return this.brandsSidebar.locator(`a[href="/brand_products/${brand}"]`)
  }

  async navigateToHome(): Promise<void> {
    await this.goto()
  }

  async clickContinue(): Promise<void> {
    await this.continueBtn.click()
  }

  async clickHomeBtn(): Promise<void> {
    await this.homeBtn.click()
  }

  async clickSignupLoginBtn(): Promise<void> {
    await this.signupLoginBtn.click()
  }

  async clickBrand(brand: string): Promise<void> {
    await this.brandLink(brand).click()
  }

  async clickDeleteAccountBtn(): Promise<void> {
    await this.deleteAccountBtn.click()
  }

  async expectLoggedIn(name: string): Promise<void> {
    await expect.soft(this.loggedInHeader).toContainText(name)
  }

  async expectOnHomePage(): Promise<void> {
    await this.expectToHaveUrl(/^https?:\/\/[^/]+\/?$/)
  }

  async expectAccountCreated(): Promise<void> {
    await expect.soft(this.accountCreatedMsg).toBeVisible()
  }

  async expectAccountDeleted(): Promise<void> {
    await expect.soft(this.accountDeletedMsg).toBeVisible()
  }
}
