import { APIResponse, expect } from '@playwright/test'

import { ProductsSchemas } from '@/schemas/products.schemas'
import { BrandsListResponse, ErrorResponse, ProductsListResponse } from '@/schemas/products.types'
import { APIExpect } from '@/test-utils/APIExpect'
import { type APISchema } from '@/test-utils/schema-validator'

import { BaseClient } from './BaseClient'

/**
 * Products API client: the catalog the shop pages are built from
 */
export class ProductsClient extends BaseClient {
  private readonly productsListEndpoint = '/api/productsList'
  private readonly brandsListEndpoint = '/api/brandsList'
  private readonly searchProductEndpoint = '/api/searchProduct'
  private readonly methodNotSupportedMsg = 'This request method is not supported.'
  private readonly searchQueryMissingMsg =
    'Bad request, search_product parameter is missing in POST request.'

  // Every response is HTTP 200: the outcome is the responseCode in the body
  private async expectBody<T>(response: APIResponse, schema: APISchema): Promise<T> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(schema)
    return apiExpect.getData<T>()
  }

  async getProductsList(): Promise<APIResponse> {
    return this.get(this.productsListEndpoint)
  }

  async postProductsList(): Promise<APIResponse> {
    return this.post(this.productsListEndpoint)
  }

  async getBrandsList(): Promise<APIResponse> {
    return this.get(this.brandsListEndpoint)
  }

  async putBrandsList(): Promise<APIResponse> {
    return this.put(this.brandsListEndpoint)
  }

  /** Without a query the parameter is left out - not sent empty */
  async searchProduct(query?: string): Promise<APIResponse> {
    return this.post(
      this.searchProductEndpoint,
      query === undefined ? {} : { form: { search_product: query } }
    )
  }

  // Assertions

  async expectProductsListed(response: APIResponse): Promise<void> {
    const data = await this.expectBody<ProductsListResponse>(response, ProductsSchemas.productsList)
    expect.soft(data.responseCode).toBe(200)
    expect.soft(data.products.length).toBeGreaterThan(0)
  }

  async expectProductListed(response: APIResponse, name: string, price: string): Promise<void> {
    const data = await this.expectBody<ProductsListResponse>(response, ProductsSchemas.productsList)
    expect.soft(data.responseCode).toBe(200)
    expect
      .soft(data.products.find((product) => product.name === name)?.price, `Price of "${name}"`)
      .toBe(price)
  }

  async expectSearchFound(response: APIResponse, name: string): Promise<void> {
    const data = await this.expectBody<ProductsListResponse>(response, ProductsSchemas.productsList)
    expect.soft(data.responseCode).toBe(200)
    expect.soft(data.products.map((product) => product.name)).toContain(name)
  }

  async expectBrandListed(response: APIResponse, brand: string): Promise<void> {
    const data = await this.expectBody<BrandsListResponse>(response, ProductsSchemas.brandsList)
    expect.soft(data.responseCode).toBe(200)
    expect.soft(data.brands.map((item) => item.brand)).toContain(brand)
  }

  async expectMethodNotSupported(response: APIResponse): Promise<void> {
    const data = await this.expectBody<ErrorResponse>(response, ProductsSchemas.error)
    expect.soft(data.responseCode).toBe(405)
    expect.soft(data.message).toBe(this.methodNotSupportedMsg)
  }

  async expectSearchQueryMissing(response: APIResponse): Promise<void> {
    const data = await this.expectBody<ErrorResponse>(response, ProductsSchemas.error)
    expect.soft(data.responseCode).toBe(400)
    expect.soft(data.message).toBe(this.searchQueryMissingMsg)
  }
}
