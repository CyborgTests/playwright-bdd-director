import { expect, type Page } from '@playwright/test'

/**
 * Base Page Object class with common navigation and assertion methods
 * All page objects should extend this class
 */
export abstract class BasePage {
  protected readonly page: Page
  protected readonly basePath: string

  constructor(page: Page, basePath: string = '/') {
    this.page = page
    this.basePath = basePath
  }

  /**
   * Navigate to page base path
   */
  async goto(): Promise<void> {
    await this.page.goto(this.basePath)
  }

  /**
   * Navigate to specific path
   */
  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path)
  }

  /**
   * Close the "Added!" dialog that adding a product to cart opens on product pages
   */
  protected async continueShopping(): Promise<void> {
    await this.page.locator('#cartModal').getByRole('button', { name: 'Continue Shopping' }).click()
  }

  /**
   * Expect page to have specific URL
   */
  async expectToHaveUrl(url: string | RegExp): Promise<void> {
    await expect.soft(this.page).toHaveURL(url)
  }

  async expectHeadingVisible(name: string): Promise<void> {
    await expect.soft(this.page.getByRole('heading', { name })).toBeVisible()
  }
}
