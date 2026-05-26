import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearMDCache, parseMDFile } from '@/framework/core/md-parser'

// Temporary test directory
const TEST_DIR = path.join(process.cwd(), '.test-tmp')

beforeEach(() => {
  // Create temp directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  }
  clearMDCache()
})

afterEach(() => {
  // Cleanup temp directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  }
  clearMDCache()
})

function createMDFile(fileName: string, content: string): string {
  const filePath = path.join(TEST_DIR, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

describe('parseMDFile', () => {
  describe('valid markdown with IDs', () => {
    it('should parse suite with ID and test cases with IDs', () => {
      const content = `## [TS01] Authentication Suite

### [TC-01] Login with valid credentials

#### [01-01-01] Open login page
#### [01-01-02] Enter username and password
#### [01-01-03] Click submit button

### [TC-02] Login with invalid credentials

#### [01-02-01] Open login page
#### [01-02-02] Enter invalid credentials
`
      const filePath = createMDFile('auth.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteID).toBe('TS01')
      expect(result.suiteTtl).toBe('Authentication Suite')
      expect(result.testCases).toHaveLength(2)

      expect(result.testCases[0]).toEqual({
        id: 'TC-01',
        ttl: 'Login with valid credentials',
        stepTtls: [
          '[01-01-01] Open login page',
          '[01-01-02] Enter username and password',
          '[01-01-03] Click submit button'
        ]
      })

      expect(result.testCases[1]).toEqual({
        id: 'TC-02',
        ttl: 'Login with invalid credentials',
        stepTtls: ['[01-02-01] Open login page', '[01-02-02] Enter invalid credentials']
      })
    })

    it('should parse suite with empty ID []', () => {
      const content = `## [] Test Suite

### [] Test case

#### Step 1
`
      const filePath = createMDFile('empty-id.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteID).toBe('')
      expect(result.suiteTtl).toBe('Test Suite')
      expect(result.testCases[0].id).toBe('')
      expect(result.testCases[0].ttl).toBe('Test case')
    })

    it('should handle extra spaces in IDs and titles', () => {
      const content = `## [  TS01  ]   Test Suite

### [  TC-01  ]   Test case

####   Step
`
      const filePath = createMDFile('spaces.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteID).toBe('TS01')
      expect(result.suiteTtl).toBe('Test Suite')
      expect(result.testCases[0].id).toBe('TC-01')
      expect(result.testCases[0].ttl).toBe('Test case')
      expect(result.testCases[0].stepTtls[0]).toBe('Step')
    })
  })

  describe('valid markdown without IDs', () => {
    it('should parse suite and test cases without IDs', () => {
      const content = `## Authentication Suite

### Login with valid credentials

#### Open login page
#### Enter username and password
#### Click submit button

### Login with invalid credentials

#### Open login page
`
      const filePath = createMDFile('no-ids.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteID).toBe('')
      expect(result.suiteTtl).toBe('Authentication Suite')
      expect(result.testCases).toHaveLength(2)

      expect(result.testCases[0]).toEqual({
        id: null,
        ttl: 'Login with valid credentials',
        stepTtls: ['Open login page', 'Enter username and password', 'Click submit button']
      })

      expect(result.testCases[1]).toEqual({
        id: null,
        ttl: 'Login with invalid credentials',
        stepTtls: ['Open login page']
      })
    })

    it('should ignore comments after steps', () => {
      const content = `## Test Suite

### Test case

#### Step 1
This is a comment and should be ignored
Another comment line

#### Step 2
`
      const filePath = createMDFile('comments.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual(['Step 1', 'Step 2'])
    })

    it('should handle multiple test cases', () => {
      const content = `## Suite

### Test 1
#### Step 1-1

### Test 2
#### Step 2-1

### Test 3
#### Step 3-1
`
      const filePath = createMDFile('multi.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases).toHaveLength(3)
      expect(result.testCases[0].ttl).toBe('Test 1')
      expect(result.testCases[1].ttl).toBe('Test 2')
      expect(result.testCases[2].ttl).toBe('Test 3')
    })
  })

  describe('mixed formats', () => {
    it('should handle mix of IDs and no IDs', () => {
      const content = `## [TS01] Suite

### [TC-01] Test with ID
#### Step with ID

### Test without ID
#### Step without ID
`
      const filePath = createMDFile('mixed.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases[0].id).toBe('TC-01')
      expect(result.testCases[0].stepTtls[0]).toBe('Step with ID')
      expect(result.testCases[1].id).toBe(null)
      expect(result.testCases[1].stepTtls[0]).toBe('Step without ID')
    })

    it('should preserve brackets in titles', () => {
      const content = `## Suite

### Test [important] case
#### Step [critical] action
`
      const filePath = createMDFile('brackets-in-title.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases[0].ttl).toBe('Test [important] case')
      expect(result.testCases[0].stepTtls[0]).toBe('Step [critical] action')
    })
  })

  describe('error cases', () => {
    it('should throw error when suite title is missing', () => {
      const content = `### Test case
#### Step
`
      const filePath = createMDFile('no-suite.md', content)

      expect(() => parseMDFile(filePath)).toThrow('test suite title')
    })

    it('should throw error when test cases are missing', () => {
      const content = `## Suite Title

Some text but no test cases
`
      const filePath = createMDFile('no-tests.md', content)

      expect(() => parseMDFile(filePath)).toThrow('test cases')
    })

    it('should throw error for duplicate test case IDs', () => {
      const content = `## Suite

### [TC-01] First test
#### Step 1

### [TC-01] Second test with duplicate ID
#### Step 2
`
      const filePath = createMDFile('duplicate-ids.md', content)

      expect(() => parseMDFile(filePath)).toThrow('Duplicate test case IDs')
      expect(() => parseMDFile(filePath)).toThrow('[TC-01]')
    })

    it('should allow empty IDs [] for all test cases (no duplicates)', () => {
      const content = `## Suite

### [] First test
#### Step 1

### [] Second test
#### Step 2
`
      const filePath = createMDFile('all-empty-ids.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases).toHaveLength(2)
      expect(result.testCases[0].id).toBe('')
      expect(result.testCases[1].id).toBe('')
    })

    it('should allow null IDs for all test cases (no duplicates)', () => {
      const content = `## Suite

### First test
#### Step 1

### Second test
#### Step 2
`
      const filePath = createMDFile('all-null-ids.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases).toHaveLength(2)
      expect(result.testCases[0].id).toBe(null)
      expect(result.testCases[1].id).toBe(null)
    })

    it('should throw error when file does not exist', () => {
      expect(() => parseMDFile('nonexistent.md')).toThrow('Markdown file not found')
    })

    it('should throw error for path traversal attack', () => {
      expect(() => parseMDFile('../etc/passwd')).toThrow('Path traversal')
    })

    it('should throw error for invalid characters in filename', () => {
      expect(() => parseMDFile('file@name.md')).toThrow('Invalid file name')
    })

    it('should throw error for null byte in filename', () => {
      expect(() => parseMDFile('file\0name')).toThrow('Path traversal')
    })
  })

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const filePath = createMDFile('empty.md', '')

      expect(() => parseMDFile(filePath)).toThrow('test suite title')
    })

    it('should handle file with only suite title', () => {
      const content = `## Suite Title`
      const filePath = createMDFile('only-suite.md', content)

      expect(() => parseMDFile(filePath)).toThrow('test cases')
    })

    it('should handle test case without steps', () => {
      const content = `## Suite

### Test without steps
`
      const filePath = createMDFile('no-steps.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual([])
    })

    it('should handle blank lines', () => {
      const content = `## Suite


### Test


#### Step 1


#### Step 2

`
      const filePath = createMDFile('blank-lines.md', content)

      const result = parseMDFile(filePath)

      expect(result.testCases[0].stepTtls).toHaveLength(2)
    })

    it('should handle Windows line endings (CRLF)', () => {
      const content = `## Suite\r\n\r\n### Test\r\n\r\n#### Step\r\n`
      const filePath = createMDFile('crlf.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteTtl).toBe('Suite')
      expect(result.testCases[0].ttl).toBe('Test')
      expect(result.testCases[0].stepTtls[0]).toBe('Step')
    })

    it('should ignore H1, H5, H6 headings', () => {
      const content = `# This is H1

## Suite

##### This is H5

### Test

###### This is H6

#### Step
`
      const filePath = createMDFile('other-headings.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteTtl).toBe('Suite')
      expect(result.testCases[0].stepTtls).toHaveLength(1)
    })

    it('should handle complex IDs with multiple dashes', () => {
      const content = `## [TS-01-COMPLEX] Suite

### [TC-01-02-03] Test
#### Step
`
      const filePath = createMDFile('complex-ids.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteID).toBe('TS-01-COMPLEX')
      expect(result.testCases[0].id).toBe('TC-01-02-03')
      expect(result.testCases[0].stepTtls[0]).toBe('Step')
    })

    it('should handle Unicode characters in titles', () => {
      const content = `## Тестовий набір

### Тест кейс 日本語
#### Крок №1 🎯
`
      const filePath = createMDFile('unicode.md', content)

      const result = parseMDFile(filePath)

      expect(result.suiteTtl).toBe('Тестовий набір')
      expect(result.testCases[0].ttl).toBe('Тест кейс 日本語')
      expect(result.testCases[0].stepTtls[0]).toBe('Крок №1 🎯')
    })
  })

  describe('caching', () => {
    it('should cache MD file lookups', () => {
      const content = `## Suite
### Test
#### Step
`
      const filePath = createMDFile('cached.md', content)

      // First call - should search filesystem
      const result1 = parseMDFile(filePath)
      expect(result1.suiteTtl).toBe('Suite')

      // Second call - should use cache (same file path)
      const result2 = parseMDFile(filePath)
      expect(result2.suiteTtl).toBe('Suite')

      expect(result1).toEqual(result2)
    })

    it('should clear cache', () => {
      const content = `## Suite
### Test
#### Step
`
      const filePath = createMDFile('clear-test.md', content)

      parseMDFile(filePath)
      clearMDCache()

      // Should still work after cache clear
      const result = parseMDFile(filePath)
      expect(result.suiteTtl).toBe('Suite')
    })
  })
})
