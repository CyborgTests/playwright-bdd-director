import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ParsedMD } from '../core/md-parser'
import { parseTestFile } from '../core/ts-parser'
import { resetSharedProject } from '../utils/ts-morph-helpers'
import { autoFixTestFile, isEmptyAutoTest } from './auto-fixer'

// Temporary test directory
const TEST_DIR = path.join(process.cwd(), '.test-tmp-fixer')

beforeEach(() => {
  // Reset ts-morph project to release file locks
  resetSharedProject()

  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true })
  }
})

afterEach(() => {
  // Reset ts-morph project to release file locks before cleanup
  resetSharedProject()

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  }
})

function createTSFile(fileName: string, content: string): string {
  const filePath = path.join(TEST_DIR, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

function createMD(overrides?: Partial<ParsedMD>): ParsedMD {
  return {
    suiteID: 'TS01',
    suiteTtl: 'Correct Suite Title',
    testCases: [
      {
        id: 'TC-01',
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

test.describe('[TS01] Wrong Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Test case', async () => {})
})`
      const filePath = createTSFile('wrong-suite.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes).toContain(
        'Test suite title: "[TS01] Wrong Suite Title" → "[TS01] Correct Suite Title"'
      )

      // Verify file was actually changed
      const parsed = parseTestFile(filePath)
      expect(parsed.suiteTtl).toBe('Correct Suite Title')
    })

    it('should preserve suffix in suite title', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01-AUTO] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Test', async () => {})
})`
      const filePath = createTSFile('suite-with-suffix.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.suiteID).toBe('TS01-AUTO')
      expect(parsed.suiteTtl).toBe('Correct Suite Title')
    })

    it('should not fix suite title when it matches', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {
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
      const md = createMD({ suiteID: 'TS01', suiteTtl: 'Correct Suite Title' })

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.suiteID).toBe('TS01')
    })
  })

  describe('test case title fixes', () => {
    it('should fix test case title when it does not match', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Wrong test case', async () => {})
})`
      const filePath = createTSFile('wrong-test.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)
      expect(result.changes).toContain(
        'Test case #1 title: "[TC-01] Wrong test case" → "[TC-01] Correct test case"'
      )

      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].ttl).toBe('Correct test case')
    })

    it('should preserve suffix in test case title', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01-AUTO] Wrong test', async () => {})
})`
      const filePath = createTSFile('test-with-suffix.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.fixed).toBe(true)

      const parsed = parseTestFile(filePath)
      expect(parsed.testCases[0].id).toBe('TC-01-AUTO')
      expect(parsed.testCases[0].ttl).toBe('Correct test case')
    })

    it('should handle extra test cases', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {})
  test('[TC-02] Extra test', async () => {})
})`
      const filePath = createTSFile('extra-test.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('Extra test case #2'))).toBe(true)
    })

    it('should handle missing test cases', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {})
})`
      const filePath = createTSFile('missing-test.ts', content)
      const md = createMD({
        testCases: [
          { id: 'TC-01', ttl: 'Correct test case', stepTtls: [] },
          { id: 'TC-02', ttl: 'Missing test', stepTtls: [] }
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

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {
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

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {
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

    it('should handle missing steps', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {
    await test.step('Correct step 1', async () => {})
  })
})`
      const filePath = createTSFile('missing-step.ts', content)
      const md = createMD()

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('TC#1 Step#2'))).toBe(true)
      expect(result.changes.some((c) => c.includes('missing'))).toBe(true)
    })
  })

  describe('multiple fixes', () => {
    it('should fix suite, test case, and steps in one operation', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[TS01] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Wrong test', async () => {
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

test.describe('[TS01] Wrong Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Wrong test', async () => {
    await test.step("Step with 'quotes'", async () => {})
    await test.step('Step with \\n newline', async () => {})
  })
})`
      const filePath = createTSFile('complex-strings.ts', content)
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
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

test.describe('[TS01] Correct Suite Title', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[TC-01] Correct test case', async () => {
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
