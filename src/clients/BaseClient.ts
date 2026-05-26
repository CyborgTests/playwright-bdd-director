import { APIRequestContext, APIResponse } from '@playwright/test'

import { APIExpect } from '@/test-utils/APIExpect'

/**
 * Base API client with common HTTP methods and error handling
 * Extend this class for suite-specific API clients
 */
export abstract class BaseClient {
  protected readonly apiContext: APIRequestContext
  protected readonly baseURL: string

  constructor(apiContext: APIRequestContext, baseURL = '') {
    this.apiContext = apiContext
    this.baseURL = baseURL
  }

  /**
   * Perform GET request
   */
  protected async get(
    url: string,
    options?: { params?: Record<string, string> }
  ): Promise<APIResponse> {
    const fullUrl = this.buildUrl(url, options?.params)
    return this.apiContext.get(fullUrl)
  }

  /**
   * Perform POST request
   */
  protected async post(
    url: string,
    options?: { form?: object; json?: object }
  ): Promise<APIResponse> {
    const fullUrl = this.buildUrl(url)
    if (options?.form) {
      return this.apiContext.post(fullUrl, { form: options.form as Record<string, string> })
    }
    if (options?.json) {
      return this.apiContext.post(fullUrl, { data: options.json })
    }
    return this.apiContext.post(fullUrl)
  }

  /**
   * Perform PUT request
   */
  protected async put(
    url: string,
    options?: { form?: object; json?: object }
  ): Promise<APIResponse> {
    const fullUrl = this.buildUrl(url)
    if (options?.form) {
      return this.apiContext.put(fullUrl, { form: options.form as Record<string, string> })
    }
    if (options?.json) {
      return this.apiContext.put(fullUrl, { data: options.json })
    }
    return this.apiContext.put(fullUrl)
  }

  /**
   * Perform DELETE request
   */
  protected async delete(
    url: string,
    options?: { form?: object; params?: Record<string, string> }
  ): Promise<APIResponse> {
    const fullUrl = this.buildUrl(url, options?.params)
    if (options?.form) {
      return this.apiContext.delete(fullUrl, { form: options.form as Record<string, string> })
    }
    return this.apiContext.delete(fullUrl)
  }

  /**
   * Navigate to page (GET request for page URLs)
   */
  protected async navigate(url: string): Promise<APIResponse> {
    return this.get(url)
  }

  /**
   * Verify page is accessible (2xx status)
   */
  async expectPageAccessible(response: APIResponse): Promise<void> {
    await new APIExpect(response, { silent: true }).expectStatus('2xx')
  }

  /**
   * Build full URL with optional query parameters
   */
  private buildUrl(url: string, params?: Record<string, string>): string {
    let fullUrl = this.baseURL ? `${this.baseURL}${url}` : url

    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString()
      fullUrl += `?${queryString}`
    }

    return fullUrl
  }
}
