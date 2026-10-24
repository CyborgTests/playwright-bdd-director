import { APIResponse, expect } from '@playwright/test'

import { APIExpect } from '@/test-utils/APIExpect'

import { BaseClient } from './BaseClient'

interface ProductsListResponse {
  responseCode: number
  products: { id: number; name: string; price: string }[]
}

/**
 * Products API client: the catalog the shop pages are built from
 */
export class ProductsClient extends BaseClient {
  private readonly productsListEndpoint = '/api/productsList'

  async getProductsList(): Promise<APIResponse> {
    return this.get(this.productsListEndpoint)
  }

  async expectProductsListed(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectRequiredFields(['responseCode', 'products'])
    const data = apiExpect.getData<ProductsListResponse>()
    expect(data.responseCode).toBe(200)
    expect(data.products.length).toBeGreaterThan(0)
  }
}
