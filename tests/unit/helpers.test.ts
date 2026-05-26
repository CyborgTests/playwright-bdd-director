import { describe, expect, it } from 'vitest'

import {
  getErrorMessage,
  getMarkdownBaseName,
  getTestFileBaseName,
  hasAutomatedTestFile,
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
  describe('MANUAL tests', () => {
    it('should match MANUAL test file', () => {
      expect(isMatchingTestFile('tests/todo.MANUAL.test.ts', 'todo', 'MANUAL')).toBe(true)
    })

    it('should match MANUAL test file with path', () => {
      expect(isMatchingTestFile('tests/auth/login.MANUAL.test.ts', 'login', 'MANUAL')).toBe(true)
    })

    it('should not match different base name', () => {
      expect(isMatchingTestFile('tests/todo.MANUAL.test.ts', 'login', 'MANUAL')).toBe(false)
    })

    it('should not match AUTO test when looking for MANUAL', () => {
      expect(isMatchingTestFile('tests/todo.AUTO.test.ts', 'todo', 'MANUAL')).toBe(false)
    })
  })

  describe('AUTO tests', () => {
    it('should match AUTO test file', () => {
      expect(isMatchingTestFile('tests/todo.AUTO.test.ts', 'todo', 'AUTO')).toBe(true)
    })

    it('should not match MANUAL test when looking for AUTO', () => {
      expect(isMatchingTestFile('tests/todo.MANUAL.test.ts', 'todo', 'AUTO')).toBe(false)
    })
  })

  describe('invalid formats', () => {
    it('should not match file without .test', () => {
      expect(isMatchingTestFile('tests/todo.MANUAL.ts', 'todo', 'MANUAL')).toBe(false)
    })

    it('should not match file without .ts', () => {
      expect(isMatchingTestFile('tests/todo.MANUAL.test.js', 'todo', 'MANUAL')).toBe(false)
    })

    it('should not match file with wrong structure', () => {
      expect(isMatchingTestFile('tests/todo.ts', 'todo', 'MANUAL')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle complex base names', () => {
      expect(
        isMatchingTestFile('tests/user-auth-flow.MANUAL.test.ts', 'user-auth-flow', 'MANUAL')
      ).toBe(true)
    })

    it('should handle nested paths', () => {
      expect(isMatchingTestFile('tests/auth/login/main.MANUAL.test.ts', 'main', 'MANUAL')).toBe(
        true
      )
    })

    it('should be case-sensitive for base name', () => {
      expect(isMatchingTestFile('tests/Todo.MANUAL.test.ts', 'todo', 'MANUAL')).toBe(false)
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
