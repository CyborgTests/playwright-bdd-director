import { describe, expect, it } from 'vitest'

import {
  getErrorMessage,
  getMarkdownBaseName,
  getTestFileBaseName,
  isMatchingTestFile,
  matchIDWithSuffix,
  parseIDAndTitle
} from './helpers'

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
})

describe('getTestFileBaseName', () => {
  it('should extract base name from manual test file', () => {
    expect(getTestFileBaseName('todo.manual.test.ts')).toBe('todo')
  })

  it('should extract base name from auto test file', () => {
    expect(getTestFileBaseName('todo.auto.test.ts')).toBe('todo')
  })

  it('should extract base name from hybrid test file', () => {
    expect(getTestFileBaseName('todo.hybrid.test.ts')).toBe('todo')
  })

  it('should handle complex base names', () => {
    expect(getTestFileBaseName('user-auth-flow.manual.test.ts')).toBe('user-auth-flow')
  })

  it('should throw error for empty file name', () => {
    expect(() => getTestFileBaseName('')).toThrow(
      'Invalid file name:  (expected format: <base>.<type>.test.ts)'
    )
  })

  it('should throw error for file name starting with dot', () => {
    expect(() => getTestFileBaseName('.manual.test.ts')).toThrow('Invalid file name')
  })
})

describe('parseIDAndTitle', () => {
  it('should parse ID with title', () => {
    expect(parseIDAndTitle('[TC-01] Test case title')).toEqual({
      id: 'TC-01',
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
    expect(parseIDAndTitle('[TC-01]   Test case title  ')).toEqual({
      id: 'TC-01',
      ttl: 'Test case title'
    })
  })

  it('should handle ID with spaces inside brackets', () => {
    expect(parseIDAndTitle('[  TC-01  ] Test case title')).toEqual({
      id: 'TC-01',
      ttl: 'Test case title'
    })
  })

  it('should handle complex IDs', () => {
    expect(parseIDAndTitle('[TS01-TC02-STEP03] Step title')).toEqual({
      id: 'TS01-TC02-STEP03',
      ttl: 'Step title'
    })
  })

  it('should handle empty title with ID', () => {
    expect(parseIDAndTitle('[TC-01]')).toEqual({
      id: 'TC-01',
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
    expect(parseIDAndTitle('[TC-01] Test [important] case')).toEqual({
      id: 'TC-01',
      ttl: 'Test [important] case'
    })
  })
})

describe('matchIDWithSuffix', () => {
  describe('exact match', () => {
    it('should match identical IDs', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01-01')).toBe(true)
    })

    it('should match empty IDs', () => {
      expect(matchIDWithSuffix('', '')).toBe(true)
    })
  })

  describe('empty markdown ID ([] in MD)', () => {
    it('should match suffix-only (MANUAL)', () => {
      expect(matchIDWithSuffix('', 'MANUAL')).toBe(true)
    })

    it('should match suffix-only (AUTO)', () => {
      expect(matchIDWithSuffix('', 'AUTO')).toBe(true)
    })

    it('should match suffix-only (HYBRID)', () => {
      expect(matchIDWithSuffix('', 'HYBRID')).toBe(true)
    })

    it('should not match ID with dash', () => {
      expect(matchIDWithSuffix('', 'TC-01')).toBe(false)
    })

    it('should not match lowercase suffix', () => {
      expect(matchIDWithSuffix('', 'manual')).toBe(false)
    })

    it('should not match mixed case', () => {
      expect(matchIDWithSuffix('', 'Manual')).toBe(false)
    })
  })

  describe('non-empty markdown ID', () => {
    it('should match ID with dash suffix (TC01-01-AUTO)', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01-01-AUTO')).toBe(true)
    })

    it('should match ID with dash suffix (TC01-01-MANUAL)', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01-01-MANUAL')).toBe(true)
    })

    it('should match ID with dash suffix (TC01-01-HYBRID)', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01-01-HYBRID')).toBe(true)
    })

    it('should not match different ID', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01-02')).toBe(false)
    })

    it('should not match partial ID', () => {
      expect(matchIDWithSuffix('TC01-01', 'TC01')).toBe(false)
    })

    it('should not match ID without dash separator', () => {
      expect(matchIDWithSuffix('TC01', 'TC01AUTO')).toBe(false)
    })

    it('should match complex ID with suffix', () => {
      expect(matchIDWithSuffix('TS01-TC02-STEP03', 'TS01-TC02-STEP03-AUTO')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should not match non-empty MD ID with suffix-only', () => {
      expect(matchIDWithSuffix('TC01', 'MANUAL')).toBe(false)
    })

    it('should not match when MD ID is longer', () => {
      expect(matchIDWithSuffix('TC01-01-LONG', 'TC01-01')).toBe(false)
    })
  })
})

describe('isMatchingTestFile', () => {
  describe('manual tests', () => {
    it('should match manual test file', () => {
      expect(isMatchingTestFile('tests/todo.manual.test.ts', 'todo', 'manual')).toBe(true)
    })

    it('should match manual test file with path', () => {
      expect(isMatchingTestFile('tests/auth/login.manual.test.ts', 'login', 'manual')).toBe(true)
    })

    it('should not match different base name', () => {
      expect(isMatchingTestFile('tests/todo.manual.test.ts', 'login', 'manual')).toBe(false)
    })

    it('should not match auto test when looking for manual', () => {
      expect(isMatchingTestFile('tests/todo.auto.test.ts', 'todo', 'manual')).toBe(false)
    })
  })

  describe('auto tests', () => {
    it('should match auto test file', () => {
      expect(isMatchingTestFile('tests/todo.auto.test.ts', 'todo', 'auto')).toBe(true)
    })

    it('should not match manual test when looking for auto', () => {
      expect(isMatchingTestFile('tests/todo.manual.test.ts', 'todo', 'auto')).toBe(false)
    })
  })

  describe('invalid formats', () => {
    it('should not match file without .test', () => {
      expect(isMatchingTestFile('tests/todo.manual.ts', 'todo', 'manual')).toBe(false)
    })

    it('should not match file without .ts', () => {
      expect(isMatchingTestFile('tests/todo.manual.test.js', 'todo', 'manual')).toBe(false)
    })

    it('should not match file with wrong structure', () => {
      expect(isMatchingTestFile('tests/todo.ts', 'todo', 'manual')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle complex base names', () => {
      expect(
        isMatchingTestFile('tests/user-auth-flow.manual.test.ts', 'user-auth-flow', 'manual')
      ).toBe(true)
    })

    it('should handle nested paths', () => {
      expect(isMatchingTestFile('tests/auth/login/main.manual.test.ts', 'main', 'manual')).toBe(
        true
      )
    })

    it('should be case-sensitive for base name', () => {
      expect(isMatchingTestFile('tests/Todo.manual.test.ts', 'todo', 'manual')).toBe(false)
    })
  })
})
