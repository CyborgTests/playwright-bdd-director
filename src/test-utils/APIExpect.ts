import { APIResponse, expect } from '@playwright/test'

import { sanitizeObject } from '../test-helpers/test.helpers'
import { log } from './logger'
import { type APISchema } from './schema-validator'

interface ParsedResponse {
  data: unknown // JSON body parsed, raw text otherwise, Buffer for binary content
  contentType?: string
  status: number
}

/**
 * Soft assertions on an API response; the body is parsed once and attached to the report with
 * secrets masked (unless `silent`)
 */
export class APIExpect {
  private readonly response: APIResponse
  private readonly silent: boolean
  private parsedResponse?: ParsedResponse

  constructor(response: APIResponse, options?: { silent?: boolean }) {
    this.response = response
    this.silent = options?.silent ?? false
  }

  /**
   * Exact code (200, 404) or a range ('2xx', '4xx')
   */
  async expectStatus(expectedStatus: number | string): Promise<void> {
    const { status } = await this.parsed()
    const matches =
      typeof expectedStatus === 'string' && expectedStatus.endsWith('xx')
        ? Math.floor(status / 100) === Number(expectedStatus[0])
        : status === Number(expectedStatus)
    expect.soft(matches, `Expected status ${expectedStatus}, got ${status}`).toBe(true)
  }

  async expectContentType(expectedContentType: string): Promise<void> {
    const { contentType } = await this.parsed()
    expect
      .soft(contentType, `Expected content-type to contain '${expectedContentType}'`)
      .toContain(expectedContentType)
  }

  async expectMatchSchema(schema: APISchema): Promise<void> {
    const { data } = await this.parsed()
    expect.soft(schema.compare(data), 'Schema validation failed').toBeUndefined()
  }

  /**
   * Parsed body as the caller's type
   * @throws when no expect method has parsed the response yet
   */
  getData<T>(): T {
    if (!this.parsedResponse) {
      throw new Error('Response not parsed yet. Call expect methods first (e.g., expectStatus).')
    }
    return this.parsedResponse.data as T
  }

  private async parsed(): Promise<ParsedResponse> {
    if (this.parsedResponse) return this.parsedResponse

    const contentType = this.response.headers()['content-type']
    let data: unknown
    // Binary content: body() - text() would corrupt it
    if (contentType?.includes('application/octet-stream')) {
      data = await this.response.body()
    } else {
      const text = await this.response.text()
      // The shop API answers JSON with a text/html content type
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (!this.silent) await log('API Response', describe(data))
    this.parsedResponse = { data, contentType, status: this.response.status() }
    return this.parsedResponse
  }
}

function describe(data: unknown): string {
  if (Buffer.isBuffer(data)) return `Binary data (${data.length} bytes)`
  if (data !== null && typeof data === 'object') {
    return JSON.stringify(sanitizeObject(data), null, 2)
  }
  return String(data || 'Empty Response')
}
