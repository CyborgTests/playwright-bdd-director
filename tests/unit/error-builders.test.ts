import { describe, expect, it } from 'vitest'

import {
  buildCannotReadError,
  buildDuplicateIDError,
  buildDuplicateTitleError,
  buildDuplicateTitleInFileError,
  buildFileNotFoundError,
  buildH2NotFirstError,
  buildInvalidCharsError,
  buildInvalidFormatError,
  buildInvalidHeadingOrderError,
  buildInvalidLineFormatError,
  buildMissingElementError,
  buildMissingH2Error,
  buildMissingH3Error,
  buildMissingH4Error,
  buildMultipleH2Error,
  buildPathTraversalError
} from '@/framework/errors/error-builders'

describe('error-builders', () => {
  describe('buildDuplicateIDError', () => {
    it('should build duplicate ID error with single file', () => {
      const error = buildDuplicateIDError('Suite ID', 'TS01', ['test-suite.md'])
      expect(error).toContain('Duplicate Suite ID: [TS01]')
      expect(error).toContain('test-suite.md')
      expect(error).toContain('Fix:')
    })

    it('should build duplicate ID error with multiple files', () => {
      const error = buildDuplicateIDError('Test Case ID', 'TC-01', ['suite1.md', 'suite2.md'])
      expect(error).toContain('Duplicate Test Case ID: [TC-01]')
      expect(error).toContain('suite1.md')
      expect(error).toContain('suite2.md')
    })
  })

  describe('buildDuplicateTitleError', () => {
    it('should build duplicate title error', () => {
      const error = buildDuplicateTitleError('Test Suite', 'Authentication', [
        'auth.md',
        'login.md'
      ])
      expect(error).toContain('Duplicate Test Suite title:')
      expect(error).toContain('Authentication')
      expect(error).toContain('auth.md')
    })
  })

  describe('buildDuplicateTitleInFileError', () => {
    it('should build duplicate title in file error', () => {
      const error = buildDuplicateTitleInFileError('test.md', 'Login Test', [1, 3])
      expect(error).toContain('Duplicate Test Case title within same file')
      expect(error).toContain('test.md')
      expect(error).toContain('#1 and #3')
    })
  })

  describe('buildFileNotFoundError', () => {
    it('should build file not found error', () => {
      const error = buildFileNotFoundError('auth', '/test-suites')
      expect(error).toContain('Markdown file not found: auth.md')
      expect(error).toContain('/test-suites')
    })
  })

  describe('buildInvalidFormatError', () => {
    it('should build invalid format error', () => {
      const error = buildInvalidFormatError('Test Case ID', 'test.md', '[bad-id]', 'TC-XX-XX')
      expect(error).toContain('Invalid Test Case ID format')
      expect(error).toContain('test.md')
      expect(error).toContain('[bad-id]')
    })
  })

  describe('buildMissingElementError', () => {
    it('should build missing element error', () => {
      const error = buildMissingElementError('test cases', 'suite.md', 'Add at least one test case')
      expect(error).toContain('No test cases found')
      expect(error).toContain('suite.md')
      expect(error).toContain('Add at least one test case')
    })
  })

  describe('buildPathTraversalError', () => {
    it('should build path traversal error', () => {
      const error = buildPathTraversalError('../../../etc/passwd')
      expect(error).toContain('Path traversal detected')
      expect(error).toContain('../../../etc/passwd')
      expect(error).toContain('..')
    })
  })

  describe('buildInvalidCharsError', () => {
    it('should build invalid chars error', () => {
      const error = buildInvalidCharsError('test<>file', 'a-z, 0-9, -, _')
      expect(error).toContain('Invalid file name:')
      expect(error).toContain('test<>file')
      expect(error).toContain('Allowed characters')
    })
  })

  describe('buildCannotReadError', () => {
    it('should build cannot read error', () => {
      const error = buildCannotReadError('/path/to/file.md', 'Permission denied')
      expect(error).toContain('Cannot read file')
      expect(error).toContain('/path/to/file.md')
      expect(error).toContain('Permission denied')
    })
  })

  describe('MD structure errors', () => {
    it('should build missing H2 error', () => {
      const error = buildMissingH2Error()
      expect(error).toContain('Missing test suite title')
      expect(error).toContain('H2 heading')
    })

    it('should build multiple H2 error', () => {
      const locations = '    Line 1: ## Suite 1\n    Line 5: ## Suite 2'
      const error = buildMultipleH2Error(2, locations)
      expect(error).toContain('Multiple test suite titles')
      expect(error).toContain('2 H2 headings')
      expect(error).toContain('Line 1')
    })

    it('should build H2 not first error', () => {
      const error = buildH2NotFirstError('### Test Case')
      expect(error).toContain('First heading must be test suite title')
      expect(error).toContain('### Test Case')
    })

    it('should build missing H3 error', () => {
      const error = buildMissingH3Error('## Test Suite')
      expect(error).toContain('at least one test case')
      expect(error).toContain('## Test Suite')
    })

    it('should build missing H4 error', () => {
      const error = buildMissingH4Error('### Test Case')
      expect(error).toContain('at least one step')
      expect(error).toContain('### Test Case')
    })

    it('should build invalid heading order error', () => {
      const error = buildInvalidHeadingOrderError('test suite (##)', 1, 'step (####)', 3)
      expect(error).toContain('cannot skip levels')
      expect(error).toContain('test suite (##)')
      expect(error).toContain('step (####)')
      expect(error).toContain('(line 1)')
      expect(error).toContain('(line 3)')
    })

    it('should build invalid line format error', () => {
      const error = buildInvalidLineFormatError('random text here')
      expect(error).toContain('Invalid line format')
      expect(error).toContain('random text here')
    })
  })
})
