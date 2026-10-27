import { expect, type Locator, type Page } from '@playwright/test'

import { Given, StepsFor, Then, When } from '@/framework/bdd'

import { BasePage } from './BasePage'

/**
 * Steps on Page Object methods: the way suites migrated with such steps keep them
 * (docs/step-definitions.md, "Migrating from other tools"). New steps go to step files.
 */
@StepsFor('productsPage')
export class ProductsPage extends BasePage {
  private readonly searchInput: Locator
  private readonly searchBtn: Locator
  private readonly searchedProductsHeading: Locator
  private readonly productCards: Locator

  constructor(page: Page) {
    super(page, '/products')
    this.searchInput = this.page.locator('#search_product')
    this.searchBtn = this.page.locator('#submit_search')
    this.searchedProductsHeading = this.page.getByRole('heading', { name: 'Searched Products' })
    this.productCards = this.page.locator('.features_items .product-image-wrapper')
  }

  private productCard(name: string): Locator {
    return this.productCards.filter({
      has: this.page.locator('.productinfo').getByText(name, { exact: true })
    })
  }

  @Given('user opens the products page')
  async navigateToProducts(): Promise<void> {
    await this.goto()
  }

  @When('user searches for {string}')
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.searchBtn.click()
  }

  async addToCart(name: string): Promise<void> {
    await this.productCard(name).locator('.productinfo .add-to-cart').click()
    await this.continueShopping()
  }

  /**
   * Waits for the product page load: its "Add to cart" handler comes from cart.js at the end of the
   * page, and a click before that adds nothing (seen on Firefox, trace 2026-10-27)
   */
  async openProduct(name: string): Promise<void> {
    await this.productCard(name).getByRole('link', { name: 'View Product' }).click()
    await this.page.waitForURL(/\/product_details\/\d+/)
  }

  async expectProductPrice(name: string, price: string): Promise<void> {
    await expect.soft(this.productCard(name).locator('.productinfo h2')).toHaveText(price)
  }

  @Then('search results include {string}')
  async expectInSearchResults(name: string): Promise<void> {
    await expect.soft(this.searchedProductsHeading).toBeVisible()
    await expect.soft(this.productCard(name)).toBeVisible()
  }
}
