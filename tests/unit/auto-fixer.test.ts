import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParsedMD } from '@/framework/core/md-parser'
import { parseTestFile } from '@/framework/core/ts-parser'
import { autoFixTestFile, isEmptyAutoTest } from '@/framework/generation/auto-fixer'
import { resetSharedProject } from '@/framework/utils/ts-morph-helpers'

// Generate unique test directory for each test
let testDir: string

beforeEach(() => {
  // Reset ts-morph project to release file locks
  resetSharedProject()

  // Create unique directory with random suffix
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  testDir = path.join(process.cwd(), `.test-tmp-fixer-${randomSuffix}`)
  fs.mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  // Reset ts-morph project to release file locks before cleanup
  resetSharedProject()

  // Cleanup unique test directory
  if (fs.existsSync(testDir)) {
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors - directory is unique, won't conflict with other tests
    }
  }
})

function createTSFile(fileName: string, content: string): string {
  const filePath = path.join(testDir, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

function createMD(overrides?: Partial<ParsedMD>): ParsedMD {
  return {
    suiteID: 'ts01',
    suiteTtl: 'Correct Suite Title',
    testCases: [
      {
        id: 'tc-01',
        ttl: 'Correct test case',
        stepTtls: ['Correct step 1', 'Correct step 2']
      }
    ],
    ...overrides
  }
}

describe('autoFixTestFile', () => {
  describe('suite title fixes', () => {
    it('should fix suite title when it does not match', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Wrong Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Test case', async () => {})
})`
      const filePath = createTSFile('wrong-suite.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes).toContain(
        'Test suite title: "[ts01] Wrong Suite Title" → "[ts01] Correct Suite Title"'
      )

      // Verify file was actually changed
      const parsed = parseTestFile(filePath)
      expect(parsed.suiteTtl).toBe('Correct Suite Title')
    })

    it('should preserve suffix in suite title', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01-auto] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Test', async () => {})
})`
      const filePath = createTSFile('suite-with-suffix.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.suiteID).toBe('ts01-auto')
      expect(parsed.suiteTtl).toBe('Correct Suite Title')
    })

    it('should not fix suite title when it matches', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {
    await test.step('Correct step 1', async () => {})
    await test.step('Correct step 2', async () => {})
  })
})`
      const filePath = createTSFile('correct-suite.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(false)
      expect(result.changes).toHaveLength(0)
    })

    it('should fix suite without ID to match MD with ID', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test', async () => {})
})`
      const filePath = createTSFile('suite-no-id.ts', content)
      const md = createMD({ suiteID: 'ts01', suiteTtl: 'Correct Suite Title' })

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.suiteID).toBe('ts01')
    })
  })

  describe('test case title fixes', () => {
    it('should fix test case title when it does not match', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Wrong test case', async () => {})
})`
      const filePath = createTSFile('wrong-test.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes).toContain(
        'Test case #1 title: "[tc-01] Wrong test case" → "[tc-01] Correct test case"'
      )

      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].ttl).toBe('Correct test case')
    })

    it('should preserve suffix in test case title', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01-auto] Wrong test', async () => {})
})`
      const filePath = createTSFile('test-with-suffix.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].id).toBe('tc-01-auto')
      expect(parsed.testCases[0].ttl).toBe('Correct test case')
    })

    it('should handle extra test cases', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {})
  test('[tc-02] Extra test', async () => {})
})`
      const filePath = createTSFile('extra-test.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('Extra test case #2'))).toBe(true)
    })

    it('should handle missing test cases', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {})
})`
      const filePath = createTSFile('missing-test.ts', content)
      const md = createMD({
        testCases: [
          { id: 'tc-01', ttl: 'Correct test case', stepTtls: [] },
          { id: 'tc-02', ttl: 'Missing test', stepTtls: [] }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('Missing test case #2'))).toBe(true)
      expect(result.changes.some((c) => c.includes('Missing test'))).toBe(true)
    })
  })

  describe('step fixes', () => {
    it('should fix step titles when they do not match', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {
    await test.step('Wrong step 1', async () => {})
    await test.step('Wrong step 2', async () => {})
  })
})`
      const filePath = createTSFile('wrong-steps.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes.some((c) => c.includes('Step#1'))).toBe(true)
      expect(result.changes.some((c) => c.includes('Step#2'))).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].stepTtls).toEqual(['Correct step 1', 'Correct step 2'])
    })

    it('should handle extra steps', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {
    await test.step('Correct step 1', async () => {})
    await test.step('Correct step 2', async () => {})
    await test.step('Extra step', async () => {})
  })
})`
      const filePath = createTSFile('extra-step.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('TC#1 Step#3'))).toBe(true)
      expect(result.changes.some((c) => c.includes('extra'))).toBe(true)
    })

    it('should add placeholder for missing steps', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {
    await test.step('Correct step 1', async () => {})
  })
})`
      const filePath = createTSFile('missing-step.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes.some((c) => c.includes('TC#1 Step#2'))).toBe(true)
      expect(result.changes.some((c) => c.includes('Added'))).toBe(true)
      expect(result.changes.some((c) => c.includes('placeholder'))).toBe(true)

      // Verify placeholder was actually added to file
      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].stepTtls).toEqual(['Correct step 1', 'Correct step 2'])
    })
  })

  describe('multiple fixes', () => {
    it('should fix suite, test case, and steps in one operation', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Wrong test', async () => {
    await test.step('Wrong step 1', async () => {})
    await test.step('Wrong step 2', async () => {})
  })
})`
      const filePath = createTSFile('multiple-wrong.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes.length).toBeGreaterThan(2)

      const parsed = parseTestFile(filePath)
      expect(parsed.suiteTtl).toBe('Correct Suite Title')
      expect(parsed.testCases[0].ttl).toBe('Correct test case')
      expect(parsed.testCases[0].stepTtls).toEqual(['Correct step 1', 'Correct step 2'])
    })

    it('should not break code with complex string content', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Wrong test', async () => {
    await test.step("Step with 'quotes'", async () => {})
    await test.step('Step with \\n newline', async () => {})
  })
})`
      const filePath = createTSFile('complex-strings.ts', content)
      const md = createMD({
        testCases: [
          {
            id: 'tc-01',
            ttl: 'Correct test case',
            stepTtls: ["Step with 'quotes'", 'Step with \\n newline']
          }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      // Should fix suite and test, but not steps (they match)
      expect(result.fixed).toBe(true)

      // File should still be valid TypeScript
      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].stepTtls).toHaveLength(2)
    })
  })

  describe('no changes needed', () => {
    it('should return fixed=false when everything matches', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Correct test case', async () => {
    await test.step('Correct step 1', async () => {})
    await test.step('Correct step 2', async () => {})
  })
})`
      const filePath = createTSFile('perfect-match.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(false)
      expect(result.changes).toHaveLength(0)
      expect(result.filePath).toBe(filePath)
    })
  })

  describe('manual tests with test.step', () => {
    it('should skip auto-fixing manual tests with test.step', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/test-constants/tags'

test.describe('[MANUAL] Suite Title', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TEST] }, () => {
  test('[MANUAL] Test case', async () => {
    await test.step('Step 1', async () => {}) // First step
    await test.step('Step 2', async () => {}) // Second step with test.step
  })
})`
      const filePath = createTSFile('test-suite.manual.test.ts', content)
      const md = createMD({
        suiteID: '',
        suiteTtl: 'Suite Title',
        testCases: [
          {
            id: '',
            ttl: 'Test case',
            stepTtls: ['Step 1', 'Step 2', 'New Step 3']
          }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      // Should not auto-fix manual tests with test.step
      expect(result.fixed).toBe(false)
      expect(result.changes.some((c) => c.includes('Skipped'))).toBe(true)
      expect(result.changes.some((c) => c.includes('test.step'))).toBe(true)
    })

    it('should auto-fix manual tests without test.step', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/test-constants/tags'

test.describe('[MANUAL] Suite Title', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TEST] }, () => {
  test('[MANUAL] Test case', async () => {
    // Only comments, no test.step calls
    console.log('Step 1')
    console.log('Step 2')
  })
})`
      const filePath = createTSFile('test-suite2.manual.test.ts', content)
      const md = createMD({
        suiteID: '',
        suiteTtl: 'Suite Title',
        testCases: [
          {
            id: '',
            ttl: 'Test case',
            stepTtls: ['Step 1', 'Step 2', 'New Step 3']
          }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      // Should auto-fix manual tests without test.step
      expect(result.fixed).toBe(true)
      expect(result.changes.some((c) => c.includes('Added'))).toBe(true)
    })
  })
})

describe('isEmptyAutoTest', () => {
  it('should return true for test with empty steps', () => {
    const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test', async () => {
    await test.step('Step', async () => { /* TODO: Implement step logic */ })
  })
})`
    const filePath = createTSFile('empty-auto.ts', content)

    const result = isEmptyAutoTest(filePath)

    expect(result).toBe(true)
  })

  it('should return true for test with only comments', () => {
    const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test', async () => {
    await test.step('Step', async () => {
      // This is a comment
      /* Multi-line
         comment */
    })
  })
})`
    const filePath = createTSFile('comments-only.ts', content)

    const result = isEmptyAutoTest(filePath)

    expect(result).toBe(true)
  })

  it('should return false for test with real code', () => {
    const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test', async () => {
    await test.step('Step', async () => {
      console.log('Real code')
    })
  })
})`
    const filePath = createTSFile('has-code.ts', content)

    const result = isEmptyAutoTest(filePath)

    expect(result).toBe(false)
  })

  it('should return false when test.describe not found', () => {
    const content = `import { test } from '@playwright/test'

test('Test without describe', async () => {})`
    const filePath = createTSFile('no-describe.ts', content)

    const result = isEmptyAutoTest(filePath)

    expect(result).toBe(false)
  })

  it('should return false when no test cases', () => {
    const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  // No tests
})`
    const filePath = createTSFile('no-tests.ts', content)

    const result = isEmptyAutoTest(filePath)

    expect(result).toBe(false)
  })
})
