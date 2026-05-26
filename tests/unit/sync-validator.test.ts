import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { validate } from '@/framework/validation/sync-validator'

describe('validate', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-validator-test-'))
    originalCwd = process.cwd()
    process.chdir(tempDir)

    fs.mkdirSync(path.join(tempDir, 'test-suites'), { recursive: true })
    fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true })
  })

  afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  function createMDFile(fileName: string, content: string): void {
    const filePath = path.join(tempDir, 'test-suites', fileName)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  function _createTSFile(fileName: string, content: string): void {
    const filePath = path.join(tempDir, 'tests', fileName)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  it('should return success for empty test suites directory', () => {
    const result = validate()

    expect(result.success).toBe(true)
    expect(result.markdownFiles).toHaveLength(0)
  })

  it('should detect duplicate MD base names', () => {
    createMDFile('auth.md', '## Suite 1')
    fs.mkdirSync(path.join(tempDir, 'test-suites', 'subfolder'), { recursive: true })
    fs.writeFileSync(
      path.join(tempDir, 'test-suites', 'subfolder', 'auth.md'),
      '## Suite 2',
      'utf-8'
    )

    const result = validate()

    expect(result.success).toBe(false)
    expect(result.errors.duplicateBaseNames).toContain('Duplicate markdown base names')
  })

  it('should detect invalid MD structure', () => {
    const content = '## Suite\nInvalid line\n\n### Test\n#### Step\n'
    createMDFile('invalid.md', content)

    const result = validate()

    expect(result.success).toBe(false)
    expect(result.errors.mdStructure).toBeDefined()
    expect(result.errors.mdStructure?.length).toBeGreaterThan(0)
  })

  it('should detect missing H2', () => {
    const content = '### Test case\n#### Step 1\n'
    createMDFile('no-h2.md', content)

    const result = validate()

    expect(result.success).toBe(false)
    expect(result.errors.mdStructure).toBeDefined()
  })

  it('should detect duplicate suite IDs across files', () => {
    createMDFile('auth.md', '## [TS01] Auth\n\n### [TC-01] Test\n#### Step 1\n')

    fs.mkdirSync(path.join(tempDir, 'test-suites', 'sub'), { recursive: true })
    fs.writeFileSync(
      path.join(tempDir, 'test-suites', 'sub', 'login.md'),
      '## [TS01] Login\n\n### [TC-02] Test\n#### Step 1\n',
      'utf-8'
    )

    const result = validate()

    expect(result.success).toBe(false)
    expect(result.errors.globalIDs).toBeDefined()
    expect(result.errors.globalIDs?.some((e) => e.includes('Duplicate Suite ID'))).toBe(true)
  })

  it('should detect duplicate test case titles within same file', () => {
    const content =
      '## [TS01] Suite\n\n### [TC-01] Same Title\n#### Step 1\n\n### [TC-02] Same Title\n#### Step 1\n'
    createMDFile('duplicates.md', content)

    const result = validate()

    expect(result.success).toBe(false)
    expect(result.errors.globalIDs).toBeDefined()
    expect(result.errors.globalIDs?.some((e) => e.includes('Duplicate Test Case title'))).toBe(true)
  })

  it('should handle multiple MD files correctly', () => {
    createMDFile('auth.md', '## [AUTH] Auth\n\n### [TC-01] Login\n#### Step 1\n')
    createMDFile('todo.md', '## [TODO] Todo\n\n### [TC-01] Add\n#### Step 1\n')

    const result = validate()

    expect(result.success).toBe(false) // No matching TS files
    expect(result.markdownFiles).toHaveLength(2)
  })
})
