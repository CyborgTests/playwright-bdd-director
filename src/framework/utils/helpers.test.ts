import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  getErrorMessage,
  getMarkdownBaseName,
  getSuiteKey,
  getTestFileBaseName,
  isBackgroundTitle,
  matchesSpecCase,
  parseIDAndTitle
} from '@/framework/utils/helpers'

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error')
    expect(getErrorMessage(error)).toBe('Test error')
  })

  it('should convert string to string', () => {
    expect(getErrorMessage('String error')).toBe('String error')
  })

  it('should convert number to string', () => {
    expect(getErrorMessage(42)).toBe('42')
  })

  it('should handle null and undefined', () => {
    expect(getErrorMessage(null)).toBe('null')
    expect(getErrorMessage(undefined)).toBe('undefined')
  })

  it('should handle objects', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]')
  })
})

describe('getMarkdownBaseName', () => {
  it('should extract base name from markdown file path', () => {
    expect(getMarkdownBaseName('test-suites/todo.md')).toBe('todo')
  })

  it('should handle nested paths', () => {
    expect(getMarkdownBaseName('test-suites/auth/login.md')).toBe('login')
  })

  it('should handle absolute paths', () => {
    expect(getMarkdownBaseName('/Users/test/project/test-suites/todo.md')).toBe('todo')
  })

  it('should handle Windows paths', () => {
    expect(getMarkdownBaseName('C:\\Users\\test\\test-suites\\todo.md')).toBe('todo')
  })

  it('should handle file name with dots', () => {
    expect(getMarkdownBaseName('test-suites/my.test.suite.md')).toBe('my.test.suite')
  })

  it('should strip .feature extension of Gherkin specs', () => {
    expect(getMarkdownBaseName('test-suites/e2e/shop.feature')).toBe('shop')
  })
})

describe('isBackgroundTitle', () => {
  it('should accept "Background" with optional name only', () => {
    expect(isBackgroundTitle('Background')).toBe(true)
    expect(isBackgroundTitle('Background: Logged in user')).toBe(true)
    expect(isBackgroundTitle('Background color changes')).toBe(false)
    expect(isBackgroundTitle('Login')).toBe(false)
  })
})

describe('getTestFileBaseName', () => {
  it('should extract base name from manual test file', () => {
    expect(getTestFileBaseName('todo.manual.test.ts')).toBe('todo')
  })

  it('should extract base name from AUTO test file', () => {
    expect(getTestFileBaseName('todo.AUTO.test.ts')).toBe('todo')
  })

  it('should extract base name from HYBRID test file', () => {
    expect(getTestFileBaseName('todo.HYBRID.test.ts')).toBe('todo')
  })

  it('should handle complex base names', () => {
    expect(getTestFileBaseName('user-auth-flow.MANUAL.test.ts')).toBe('user-auth-flow')
  })

  it('should throw error for empty file name', () => {
    expect(() => getTestFileBaseName('')).toThrow(
      'Invalid file name:  (expected format: <base>.<type>.test.ts)'
    )
  })

  it('should throw error for file name starting with dot', () => {
    expect(() => getTestFileBaseName('.MANUAL.test.ts')).toThrow('Invalid file name')
  })
})

describe('parseIDAndTitle', () => {
  it('should parse ID with title', () => {
    expect(parseIDAndTitle('[tc-01] Test case title')).toEqual({
      id: 'tc-01',
      ttl: 'Test case title'
    })
  })

  it('should parse empty ID with title', () => {
    expect(parseIDAndTitle('[] Test case title')).toEqual({
      id: '',
      ttl: 'Test case title'
    })
  })

  it('should parse text without ID', () => {
    expect(parseIDAndTitle('Test case title')).toEqual({
      id: null,
      ttl: 'Test case title'
    })
  })

  it('should handle extra spaces', () => {
    expect(parseIDAndTitle('[tc-01]   Test case title  ')).toEqual({
      id: 'tc-01',
      ttl: 'Test case title'
    })
  })

  it('should handle ID with spaces inside brackets', () => {
    expect(parseIDAndTitle('[  tc-01  ] Test case title')).toEqual({
      id: 'tc-01',
      ttl: 'Test case title'
    })
  })

  it('should handle complex IDs', () => {
    expect(parseIDAndTitle('[ts01-tc02-step03] Step title')).toEqual({
      id: 'ts01-tc02-step03',
      ttl: 'Step title'
    })
  })

  it('should handle empty title with ID', () => {
    expect(parseIDAndTitle('[tc-01]')).toEqual({
      id: 'tc-01',
      ttl: ''
    })
  })

  it('should handle empty text', () => {
    expect(parseIDAndTitle('')).toEqual({
      id: null,
      ttl: ''
    })
  })

  it('should handle text with brackets in title', () => {
    expect(parseIDAndTitle('[tc-01] Test [important] case')).toEqual({
      id: 'tc-01',
      ttl: 'Test [important] case'
    })
  })
})

describe('matchesSpecCase', () => {
  const spec = { id: null, ttl: 'Pay as <card>', examples: { columns: ['card'], rows: [['Visa']] } }

  it('should match a case with ID by ID only', () => {
    expect(matchesSpecCase({ ...spec, id: 'TC-01' }, { id: 'TC-01', ttl: 'Other' })).toBe(true)
    expect(matchesSpecCase({ ...spec, id: 'TC-01' }, { id: 'TC-01-AUTO', ttl: 'Other' })).toBe(
      false
    )
  })

  it('should match a case without ID by title, declared or filled with a row', () => {
    expect(matchesSpecCase(spec, { id: null, ttl: 'Pay as <card>' })).toBe(true)
    expect(matchesSpecCase(spec, { id: null, ttl: 'Pay as Visa' })).toBe(true)
    expect(matchesSpecCase(spec, { id: null, ttl: 'Pay as Amex' })).toBe(false)
  })
})

describe('getSuiteKey', () => {
  it('should return MD path inside test suites without extension', () => {
    expect(getSuiteKey('test-suites/auth.md', 'test-suites')).toBe('auth')
    expect(getSuiteKey('test-suites/e2e/shop/checkout.md', 'test-suites')).toBe('e2e/shop/checkout')
    expect(getSuiteKey('test-suites/e2e/shop.feature', 'test-suites')).toBe('e2e/shop')
  })

  it('should use / separators on any platform', () => {
    expect(getSuiteKey(path.join('test-suites', 'e2e', 'checkout.md'), 'test-suites')).toBe(
      'e2e/checkout'
    )
  })
})
