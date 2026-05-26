import { expect, type Locator, type Page } from '@playwright/test'

import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  private readonly loginForm: Locator
  private readonly loginEmailInput: Locator
  private readonly loginPasswordInput: Locator
  private readonly loginBtn: Locator
  private readonly loginErrorMsg: Locator
  private readonly signupForm: Locator
  private readonly signupNameInput: Locator
  private readonly signupEmailInput: Locator
  private readonly signupBtn: Locator

  constructor(page: Page) {
    super(page, '/login')
    this.loginForm = this.page.locator('.login-form')
    this.loginEmailInput = this.page.locator('[data-qa="login-email"]')
    this.loginPasswordInput = this.page.locator('[data-qa="login-password"]')
    this.loginBtn = this.page.locator('[data-qa="login-button"]')
    this.loginErrorMsg = this.page.locator('.login-form p', {
      hasText: 'Your email or password is incorrect'
    })
    this.signupForm = this.page.locator('.signup-form')
    this.signupNameInput = this.page.locator('[data-qa="signup-name"]')
    this.signupEmailInput = this.page.locator('[data-qa="signup-email"]')
    this.signupBtn = this.page.locator('[data-qa="signup-button"]')
  }

  async navigateToLogin(): Promise<void> {
    await this.goto()
  }

  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email)
    await this.loginPasswordInput.fill(password)
  }

  async clickLoginBtn(): Promise<void> {
    await this.loginBtn.click()
  }

  async fillSignupForm(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name)
    await this.signupEmailInput.fill(email)
  }

  async clickSignupBtn(): Promise<void> {
    await this.signupBtn.click()
  }

  async expectLoginFormVisible(): Promise<void> {
    await expect.soft(this.loginForm).toBeVisible()
  }

  async expectSignupFormVisible(): Promise<void> {
    await expect.soft(this.signupForm).toBeVisible()
  }

  async expectLoginError(): Promise<void> {
    await expect.soft(this.loginErrorMsg).toBeVisible()
  }

  async expectEmailInputInvalid(): Promise<void> {
    const isInvalid = await this.loginEmailInput.evaluate(
      (element) => !(element as unknown as { validity: { valid: boolean } }).validity.valid
    )
    expect.soft(isInvalid).toBe(true)
  }
}
