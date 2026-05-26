import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  private readonly signupLoginBtn: Locator
  private readonly logoutBtn: Locator
  private readonly deleteAccountBtn: Locator
  private readonly continueBtn: Locator
  private readonly loggedInHeader: Locator
  private readonly accountCreatedMsg: Locator
  private readonly accountDeletedMsg: Locator

  constructor(page: Page) {
    super(page, '/')
    this.signupLoginBtn = this.page.locator('a[href="/login"]')
    this.loggedInHeader = this.page.locator('li a', { hasText: 'Logged in as' })
    this.logoutBtn = this.page.locator('a[href="/logout"]')
    this.deleteAccountBtn = this.page.locator('a[href="/delete_account"]')
    this.continueBtn = this.page.locator('[data-qa="continue-button"]')
    this.accountCreatedMsg = this.page.locator('[data-qa="account-created"]')
    this.accountDeletedMsg = this.page.locator('[data-qa="account-deleted"]')
  }

  async navigateToHome(): Promise<void> {
    await this.goto()
  }

  async clickContinue(): Promise<void> {
    await this.continueBtn.click()
  }

  async clickSignupLoginBtn(): Promise<void> {
    await this.signupLoginBtn.click()
  }

  async clickDeleteAccountBtn(): Promise<void> {
    await this.deleteAccountBtn.click()
  }

  async expectLoggedIn(name: string): Promise<void> {
    await expect.soft(this.loggedInHeader).toContainText(name)
  }

  async expectOnHomePage(): Promise<void> {
    await this.expectToHaveUrl(/.*\/#?/)
  }

  async expectOnLoginPage(): Promise<void> {
    await this.expectToHaveUrl(/.*login/)
  }

  async expectAccountCreated(): Promise<void> {
    await expect.soft(this.accountCreatedMsg).toBeVisible()
  }

  async expectAccountDeleted(): Promise<void> {
    await expect.soft(this.accountDeletedMsg).toBeVisible()
  }
}
