import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  getErrorMessage,
  getMarkdownBaseName,
  getSuiteKey,
  getSuiteSubDir,
  getTestFileBaseName,
  hasAutomatedTestFile,
  isCyborgDisabledFor,
  isMatchingTestFile,
  matchIDWithSuffix,
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

describe('matchIDWithSuffix', () => {
  describe('exact match', () => {
    it('should match identical IDs', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01-01')).toBe(true)
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
    it('should match ID with dash suffix (tc01-01-AUTO)', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01-01-AUTO')).toBe(true)
    })

    it('should match ID with dash suffix (tc01-01-MANUAL)', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01-01-MANUAL')).toBe(true)
    })

    it('should match ID with dash suffix (tc01-01-HYBRID)', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01-01-HYBRID')).toBe(true)
    })

    it('should not match different ID', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01-02')).toBe(false)
    })

    it('should not match partial ID', () => {
      expect(matchIDWithSuffix('tc01-01', 'tc01')).toBe(false)
    })

    it('should not match ID without dash separator', () => {
      expect(matchIDWithSuffix('tc01', 'tc01AUTO')).toBe(false)
    })

    it('should match complex ID with suffix', () => {
      expect(matchIDWithSuffix('ts01-tc02-step03', 'ts01-tc02-step03-AUTO')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should not match non-empty MD ID with suffix-only', () => {
      expect(matchIDWithSuffix('tc01', 'MANUAL')).toBe(false)
    })

    it('should not match when MD ID is longer', () => {
      expect(matchIDWithSuffix('tc01-01-long', 'tc01-01')).toBe(false)
    })
  })
})

describe('isMatchingTestFile', () => {
  describe('CYBORG tests', () => {
    it('should match CYBORG test file', () => {
      expect(isMatchingTestFile('tests/todo.CYBORG.test.ts', 'todo', 'CYBORG')).toBe(true)
    })

    it('should match CYBORG test file with path', () => {
      expect(isMatchingTestFile('tests/auth/login.CYBORG.test.ts', 'login', 'CYBORG')).toBe(true)
    })

    it('should not match different base name', () => {
      expect(isMatchingTestFile('tests/todo.CYBORG.test.ts', 'login', 'CYBORG')).toBe(false)
    })

    it('should not match AUTO test when looking for CYBORG', () => {
      expect(isMatchingTestFile('tests/todo.AUTO.test.ts', 'todo', 'CYBORG')).toBe(false)
    })
  })

  describe('AUTO tests', () => {
    it('should match AUTO test file', () => {
      expect(isMatchingTestFile('tests/todo.AUTO.test.ts', 'todo', 'AUTO')).toBe(true)
    })

    it('should not match CYBORG test when looking for AUTO', () => {
      expect(isMatchingTestFile('tests/todo.CYBORG.test.ts', 'todo', 'AUTO')).toBe(false)
    })
  })

  describe('invalid formats', () => {
    it('should not match file without .test', () => {
      expect(isMatchingTestFile('tests/todo.CYBORG.ts', 'todo', 'CYBORG')).toBe(false)
    })

    it('should not match file without .ts', () => {
      expect(isMatchingTestFile('tests/todo.CYBORG.test.js', 'todo', 'CYBORG')).toBe(false)
    })

    it('should not match file with wrong structure', () => {
      expect(isMatchingTestFile('tests/todo.ts', 'todo', 'CYBORG')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle complex base names', () => {
      expect(
        isMatchingTestFile('tests/user-auth-flow.CYBORG.test.ts', 'user-auth-flow', 'CYBORG')
      ).toBe(true)
    })

    it('should handle nested paths', () => {
      expect(isMatchingTestFile('tests/auth/login/main.CYBORG.test.ts', 'main', 'CYBORG')).toBe(
        true
      )
    })

    it('should be case-sensitive for base name', () => {
      expect(isMatchingTestFile('tests/Todo.CYBORG.test.ts', 'todo', 'CYBORG')).toBe(false)
    })
  })
})

describe('hasAutomatedTestFile', () => {
  it('should return true for .AUTO.test.ts', () => {
    expect(hasAutomatedTestFile(['tests/auth.AUTO.test.ts'], 'auth')).toBe(true)
  })

  it('should return true for .API.test.ts', () => {
    expect(hasAutomatedTestFile(['tests/auth.API.test.ts'], 'auth')).toBe(true)
  })

  it('should return true for .UI.test.ts', () => {
    expect(hasAutomatedTestFile(['tests/auth.UI.test.ts'], 'auth')).toBe(true)
  })

  it('should return true for .E2E.test.ts', () => {
    expect(hasAutomatedTestFile(['tests/auth.E2E.test.ts'], 'auth')).toBe(true)
  })

  it('should return false for .MANUAL.test.ts only', () => {
    expect(hasAutomatedTestFile(['tests/auth.MANUAL.test.ts'], 'auth')).toBe(false)
  })

  it('should return false for empty candidates', () => {
    expect(hasAutomatedTestFile([], 'auth')).toBe(false)
  })

  it('should return false for different base name', () => {
    expect(hasAutomatedTestFile(['tests/todo.AUTO.test.ts'], 'auth')).toBe(false)
  })

  it('should return true if any automated kind present among multiple files', () => {
    expect(
      hasAutomatedTestFile(['tests/auth.MANUAL.test.ts', 'tests/auth.API.test.ts'], 'auth')
    ).toBe(true)
  })
})

describe('getSuiteKey / getSuiteSubDir', () => {
  it('should return MD path inside test suites without extension', () => {
    expect(getSuiteKey('test-suites/auth.md', 'test-suites')).toBe('auth')
    expect(getSuiteKey('test-suites/e2e/shop/checkout.md', 'test-suites')).toBe('e2e/shop/checkout')
  })

  it('should use / separators on any platform', () => {
    expect(getSuiteKey(path.join('test-suites', 'e2e', 'checkout.md'), 'test-suites')).toBe(
      'e2e/checkout'
    )
  })

  it('should return MD folder or empty string for root', () => {
    expect(getSuiteSubDir('test-suites/auth.md', 'test-suites')).toBe('')
    expect(getSuiteSubDir('test-suites/e2e/shop/checkout.md', 'test-suites')).toBe('e2e/shop')
  })
})

describe('isCyborgDisabledFor', () => {
  const isDisabled = (md: string, noCyborg: string[]) =>
    isCyborgDisabledFor(md, noCyborg, 'test-suites')

  it('should be false when nothing is listed', () => {
    expect(isDisabled('test-suites/api/users.md', [])).toBe(false)
  })

  it('should cover all MDs of listed folder, including nested ones', () => {
    expect(isDisabled('test-suites/api/users.md', ['api'])).toBe(true)
    expect(isDisabled('test-suites/api/v2/users.md', ['api'])).toBe(true)
  })

  it('should cover single listed MD only', () => {
    expect(isDisabled('test-suites/e2e/checkout.md', ['e2e/checkout'])).toBe(true)
    expect(isDisabled('test-suites/e2e/cart.md', ['e2e/checkout'])).toBe(false)
  })

  it('should not match by name prefix', () => {
    expect(isDisabled('test-suites/api-legacy/users.md', ['api'])).toBe(false)
  })
})
