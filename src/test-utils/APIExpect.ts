/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIResponse, expect } from '@playwright/test'

import { getNestedField } from '../test-helpers/object.helpers'
import { sanitizeObject } from '../test-helpers/test.helpers'
import { log } from './logger'

type ParsedResponse = {
  data: any
  contentType?: string
  status: number
  headers: Record<string, string>
}

export class APIExpect {
  private response: APIResponse
  private parsedResponse?: ParsedResponse
  private silent: boolean

  constructor(response: APIResponse, options?: { silent?: boolean }) {
    this.response = response
    this.silent = options?.silent ?? false
  }

  /**
   * Validates response status code
   * Supports exact codes (200, 404) and ranges (2xx, 3xx, 4xx, 5xx)
   */
  async expectStatus(expectedStatus: number | string): Promise<void> {
    await this.ensureParsed()

    const isValid = this.validateStatus(this.parsedResponse!.status, expectedStatus)
    expect
      .soft(isValid, `Expected status ${expectedStatus}, got ${this.parsedResponse!.status}`)
      .toBeTruthy()
  }

  /**
   * Validates response Content-Type header
   */
  async expectContentType(expectedContentType: string): Promise<void> {
    await this.ensureParsed()

    const actual = this.parsedResponse!.contentType
    expect
      .soft(actual, `Expected content-type to contain '${expectedContentType}', got '${actual}'`)
      .toContain(expectedContentType)
  }

  /**
   * Validates presence of required headers
   */
  async expectHeaders(expectedHeaders: string[]): Promise<void> {
    await this.ensureParsed()

    for (const header of expectedHeaders) {
      const value = this.parsedResponse!.headers[header.toLowerCase()]
      expect.soft(value, `Missing required header: '${header}'`).toBeDefined()
    }
  }

  /**
   * Validates presence of required fields in response data
   * Supports nested fields via dot notation (e.g., 'user.name')
   */
  async expectRequiredFields(requiredFields: string[]): Promise<void> {
    await this.ensureParsed()

    const data = this.parsedResponse!.data

    if (!data) {
      expect
        .soft(data, 'Response data is null or undefined, cannot check required fields')
        .toBeDefined()
      return
    }

    for (const path of requiredFields) {
      const value = getNestedField(data, path)
      expect.soft(value, `Missing required field: '${path}'`).toBeDefined()
    }
  }

  /**
   * Validates response data against Joi schema
   */
  async expectMatchSchema(schema: { compare: (_data: any) => string | undefined }): Promise<void> {
    await this.ensureParsed()

    const data = this.parsedResponse!.data

    if (!data) {
      expect.soft(data, 'Response data is null or undefined, cannot validate schema').toBeDefined()
      return
    }

    const validationError = schema.compare(data)
    expect.soft(validationError, `Schema validation failed`).toBeUndefined()
  }

  /**
   * Returns parsed response data
   * @throws if response hasn't been parsed yet (call expect methods first)
   */
  getData<T = any>(): T {
    if (!this.parsedResponse) {
      throw new Error('Response not parsed yet. Call expect methods first (e.g., expectStatus).')
    }
    return this.parsedResponse.data as T
  }

  /**
   * Checks if response has been parsed
   */
  isParsed(): boolean {
    return !!this.parsedResponse
  }

  /**
   * Returns raw APIResponse object
   * Useful for accessing response.url() or other raw properties
   */
  getRawResponse(): APIResponse {
    return this.response
  }

  /**
   * Checks if status matches expectation (exact code or range)
   */
  private validateStatus(status: number, expectedStatus: number | string): boolean {
    // Check for range pattern (2xx, 3xx, 4xx, 5xx)
    if (typeof expectedStatus === 'string' && expectedStatus.endsWith('xx')) {
      const expectedRange = expectedStatus.charAt(0)
      const actualRange = Math.floor(status / 100).toString()
      return actualRange === expectedRange
    }

    // Check for exact status code
    const expectedCode =
      typeof expectedStatus === 'string' ? parseInt(expectedStatus, 10) : expectedStatus
    return status === expectedCode
  }

  /**
   * Parses response once and caches result
   */
  private async ensureParsed(): Promise<void> {
    if (this.parsedResponse) {
      return
    }

    if (!this.response) {
      throw new Error('APIExpect: response is undefined')
    }

    const headers =
      typeof this.response.headers === 'function'
        ? this.response.headers()
        : (this.response.headers as any as Record<string, string>)

    const contentType = headers?.['content-type']
    const status = (
      typeof this.response.status === 'function' ? this.response.status() : this.response.status
    ) as number

    // Parse response body
    let responseData: any = null
    try {
      // For binary content, use body() instead of text() to avoid corruption
      if (
        contentType?.includes('application/octet-stream') ||
        contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ) {
        responseData = await this.response.body()
      } else {
        const rawText = await this.response.text()

        if (contentType?.includes('application/json')) {
          const parsed = JSON.parse(rawText)
          responseData = parsed?.data ?? parsed
        } else if (contentType?.includes('text/plain') || contentType?.includes('text/html')) {
          // Try to parse as JSON even for text/html responses
          try {
            const parsed = JSON.parse(rawText)
            responseData = parsed?.data ?? parsed
          } catch {
            // If not JSON, keep as raw text
            responseData = rawText
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to parse response body: ${errorMessage}`, { cause: error })
    }

    // Log parsed response
    if (!this.silent && process.env.NO_LOGS !== 'true') {
      try {
        let logData = 'Empty Response'
        if (responseData) {
          if (Buffer.isBuffer(responseData)) {
            logData = `Binary data (${responseData.length} bytes)`
          } else if (typeof responseData === 'object') {
            const sanitized = sanitizeObject(responseData)
            logData = JSON.stringify(sanitized, null, 2)
          } else {
            logData = responseData
          }
        }
        await log('API Response', logData)
      } catch {
        // Ignore logging errors to prevent blocking validation
      }
    }

    this.parsedResponse = {
      data: responseData,
      contentType,
      status,
      headers
    }
  }
}
