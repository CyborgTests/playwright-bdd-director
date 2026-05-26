import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { autoFixMDFormatting, validateMDStructure } from '@/framework/validation/md-validator'

describe('validateMDStructure', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-validator-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  function createMDFile(fileName: string, content: string): string {
    const filePath = path.join(tempDir, fileName)
    fs.writeFileSync(filePath, content, 'utf-8')
    return filePath
  }

  it('should validate perfect MD structure', () => {
    const content = `## [TS01] Test Suite

### [TC-01] Test case

#### Step 1
#### Step 2

### [TC-02] Another test case

#### Step 1
`
    const filePath = createMDFile('valid.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors).toHaveLength(0)
  })

  it('should detect missing H2', () => {
    const content = `### Test case

#### Step 1
`
    const filePath = createMDFile('no-h2.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('Missing test suite'))).toBe(true)
  })

  it('should detect multiple H2', () => {
    const content = `## Suite 1

### Test case
#### Step 1

## Suite 2

### Another test case
#### Step 1
`
    const filePath = createMDFile('multiple-h2.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('Multiple test suite'))).toBe(true)
  })

  it('should detect H2 not first', () => {
    const content = `### Test case
#### Step 1

## Suite Title
`
    const filePath = createMDFile('h2-not-first.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('First heading must be'))).toBe(true)
  })

  it('should detect missing H3', () => {
    const content = `## Test Suite

#### Step 1
`
    const filePath = createMDFile('no-h3.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('must have at least one test case'))).toBe(true)
  })

  it('should detect missing H4 after H3', () => {
    const content = `## Test Suite

### Test case without steps

### Another test case
#### Step 1
`
    const filePath = createMDFile('no-h4.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('must have at least one step'))).toBe(true)
  })

  it('should detect invalid line format', () => {
    const content = `## Test Suite

### Test case
#### Step 1
Invalid line without proper format
`
    const filePath = createMDFile('invalid-line.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('Invalid line format'))).toBe(true)
  })

  it('should detect invalid heading order (skip level)', () => {
    const content = `## Test Suite

#### Step 1 (no H3 before)
`
    const filePath = createMDFile('skip-level.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.message.includes('cannot skip levels'))).toBe(true)
  })

  it('should handle empty file', () => {
    const filePath = createMDFile('empty.md', '')

    const errors = validateMDStructure(filePath)

    expect(errors.length).toBeGreaterThan(0)
  })

  it('should handle comments (- list items)', () => {
    const content = `## Test Suite

### Test case
#### Step 1
- Comment 1
- Comment 2

#### Step 2
`
    const filePath = createMDFile('with-comments.md', content)

    const errors = validateMDStructure(filePath)

    expect(errors).toHaveLength(0)
  })
})

describe('autoFixMDFormatting', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-autofix-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  function createMDFile(fileName: string, content: string): string {
    const filePath = path.join(tempDir, fileName)
    fs.writeFileSync(filePath, content, 'utf-8')
    return filePath
  }

  it('should fix spacing in headers', () => {
    const content = `##Test Suite

###Test case
####Step 1
`
    const filePath = createMDFile('bad-spacing.md', content)

    const modified = autoFixMDFormatting(filePath)

    expect(modified).toBe(true)

    const fixedContent = fs.readFileSync(filePath, 'utf-8')
    expect(fixedContent).toContain('## Test Suite')
    expect(fixedContent).toContain('### Test case')
    expect(fixedContent).toContain('#### Step 1')
  })

  it('should fix list marker spacing', () => {
    const content = `## Test Suite

### Test case
#### Step 1
-Comment with bad spacing
`
    const filePath = createMDFile('bad-list.md', content)

    const modified = autoFixMDFormatting(filePath)

    expect(modified).toBe(true)

    const fixedContent = fs.readFileSync(filePath, 'utf-8')
    expect(fixedContent).toContain('- Comment with bad spacing')
  })

  it('should remove multiple blank lines', () => {
    const content = `## Test Suite



### Test case


#### Step 1
`
    const filePath = createMDFile('multiple-blanks.md', content)

    const modified = autoFixMDFormatting(filePath)

    expect(modified).toBe(true)
  })

  it('should add blank line after header', () => {
    const content = `## Test Suite
### Test case
#### Step 1
`
    const filePath = createMDFile('no-blank-after-header.md', content)

    const modified = autoFixMDFormatting(filePath)

    expect(modified).toBe(true)
  })
})
