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
    suiteTags: [],
    testCases: [
      {
        id: 'tc-01',
        ttl: 'Correct test case',
        stepTtls: ['Correct step 1', 'Correct step 2'],
        tags: []
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

      expect(result.warnings.some((w) => w.includes('Extra test case "[tc-02] Extra test"'))).toBe(
        true
      )
      expect(parseTestFile(filePath).testCases).toHaveLength(2) // Code is never deleted
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
          { id: 'tc-01', ttl: 'Correct test case', stepTtls: [], tags: [] },
          { id: 'tc-02', ttl: 'Missing test', stepTtls: [], tags: [] }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      expect(result.changes.some((c) => c.includes('Added "[tc-02] Missing test"'))).toBe(true)
      expect(parseTestFile(filePath).testCases.map((tc) => tc.ttl)).toEqual([
        'Correct test case',
        'Missing test'
      ])
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

      expect(result.warnings.some((w) => w.includes('TC#1 extra step "Extra step"'))).toBe(true)
      expect(result.fixed).toBe(false)
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content)
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
            stepTtls: ["Step with 'quotes'", 'Step with \\n newline'],
            tags: []
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
    it('should not touch steps of cyborg tests structured with test.step', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/test-constants/tags'

test.describe('[CYBORG] Suite Title', { tag: [TAG.TEST.CYBORG, TAG.SUITE.TEST] }, () => {
  test('[CYBORG] Old case', async () => {
    await test.step('Step 1', async () => {})
    await test.step('Step 2', async () => {})
  })
})`
      const filePath = createTSFile('test-suite.cyborg.test.ts', content)
      const md = createMD({
        suiteID: '',
        suiteTtl: 'Suite Title',
        testCases: [
          { id: '', ttl: 'New case', stepTtls: ['Step 1', 'Step 2', 'New Step 3'], tags: [] }
        ]
      })

      const result = autoFixTestFile(filePath, md)

      const parsed = parseTestFile(filePath)
      expect(result.fixed).toBe(true)
      expect(parsed.testCases[0].ttl).toBe('New case')
      expect(parsed.testCases[0].stepTtls).toEqual(['Step 1', 'Step 2'])
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
            stepTtls: ['Step 1', 'Step 2', 'New Step 3'],
            tags: []
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

describe('isEmptyAutoTest - tests without steps', () => {
  const header = `import { test } from '@playwright/test'\n\n`

  it('should return false when test without steps has real code', () => {
    const filePath = createTSFile(
      'no-steps-code.ts',
      `${header}test.describe('Suite', () => {
  test('Test', async ({ page }) => {
    await page.goto('/')
  })
})`
    )

    expect(isEmptyAutoTest(filePath)).toBe(false)
  })

  it('should return true when test without steps has only comments', () => {
    const filePath = createTSFile(
      'no-steps-empty.ts',
      `${header}test.describe('Suite', () => {
  test('Test', async () => {
    // TODO: implement
  })
})`
    )

    expect(isEmptyAutoTest(filePath)).toBe(true)
  })

  it('should return false when file only delegates to other functions', () => {
    const filePath = createTSFile(
      'delegating.ts',
      `${header}test.describe('Suite', () => {
  registrationTests(test)
})`
    )

    expect(isEmptyAutoTest(filePath)).toBe(false)
  })
})

describe('autoFixTestFile - Background', () => {
  it('should insert missing Background as named test.beforeEach before other cases', () => {
    const filePath = createTSFile(
      'shop.cyborg.test.ts',
      `import test from '@cyborgtests/test'

test.describe('[CYBORG] Shop', () => {
  test('[CYBORG] Buy', async ({ manualStep }) => {
    await manualStep('When user buys product')
  })
})`
    )

    const result = autoFixTestFile(filePath, {
      suiteID: '',
      suiteTtl: 'Shop',
      suiteTags: [],
      testCases: [
        { id: null, ttl: 'Background', stepTtls: ['Given user is logged in'], tags: [] },
        { id: '', ttl: 'Buy', stepTtls: ['When user buys product'], tags: [] }
      ]
    })

    const code = fs.readFileSync(filePath, 'utf-8')
    expect(result.changes.some((c) => c.includes('Added "Background"'))).toBe(true)
    expect(code).toContain("test.beforeEach('Background', async ({ manualStep }) => {")
    expect(code.indexOf('test.beforeEach')).toBeLessThan(code.indexOf("test('[CYBORG] Buy'"))
    expect(parseTestFile(filePath).testCases.map((tc) => tc.ttl)).toEqual(['Background', 'Buy'])
  })
})

describe('autoFixTestFile - alignment by title', () => {
  const mdOf = (cases: Array<[string, string[]]>) => ({
    suiteID: '',
    suiteTtl: 'Suite',
    suiteTags: [],
    testCases: cases.map(([ttl, stepTtls]) => ({ id: '', ttl, stepTtls, tags: [] }))
  })

  it('should insert MD case added in the middle without moving code to other titles', () => {
    const filePath = createTSFile(
      'middle.cyborg.test.ts',
      `import { test } from '@playwright/test'

test.describe('[CYBORG] Suite', () => {
  test('[CYBORG] Login', async ({ page, manualStep }) => {
    await test.step('Open login', async () => {
      await page.goto('/login')
      await manualStep('Check form')
    })
  })

  test('[CYBORG] Logout', async ({ page, manualStep }) => {
    await test.step('Click logout', async () => {
      await page.click('#logout')
      await manualStep('Check logged out')
    })
  })
})`
    )

    autoFixTestFile(
      filePath,
      mdOf([
        ['Login', ['Open login']],
        ['Register', ['Fill form']],
        ['Logout', ['Click logout']]
      ])
    )

    const parsed = parseTestFile(filePath)
    expect(parsed.testCases.map((tc) => tc.ttl)).toEqual(['Login', 'Register', 'Logout'])
    expect(parsed.testCases[1].stepTtls).toEqual(['Fill form'])
    const code = fs.readFileSync(filePath, 'utf-8')
    expect(code.indexOf("page.click('#logout')")).toBeGreaterThan(code.indexOf('[CYBORG] Logout'))
    expect(code).toContain("await manualStep('Fill form')")
  })

  it('should insert MD step added in the middle at its position', () => {
    const filePath = createTSFile(
      'steps.cyborg.test.ts',
      `import { test } from '@playwright/test'

test.describe('[CYBORG] Suite', () => {
  test('[CYBORG] Case', async ({ manualStep }) => {
    await manualStep('First')
    await manualStep('Third')
  })
})`
    )

    autoFixTestFile(filePath, mdOf([['Case', ['First', 'Second', 'Third']]]))

    expect(parseTestFile(filePath).testCases[0].stepTtls).toEqual(['First', 'Second', 'Third'])
  })

  it('should keep code of removed case and report it instead of renaming another case', () => {
    const filePath = createTSFile(
      'removed.cyborg.test.ts',
      `import { test } from '@playwright/test'

test.describe('[CYBORG] Suite', () => {
  test('[CYBORG] A', async ({ manualStep }) => {
    await manualStep('a')
  })
  test('[CYBORG] B', async ({ manualStep }) => {
    await manualStep('b')
  })
  test('[CYBORG] C', async ({ manualStep }) => {
    await manualStep('c')
  })
})`
    )

    const result = autoFixTestFile(
      filePath,
      mdOf([
        ['A', ['a']],
        ['C', ['c']]
      ])
    )

    expect(parseTestFile(filePath).testCases.map((tc) => tc.ttl)).toEqual(['A', 'B', 'C'])
    expect(result.warnings.some((w) => w.includes('Extra test case "[CYBORG] B"'))).toBe(true)
  })

  it('should save changes and report warnings separately when both occur', () => {
    const filePath = createTSFile(
      'mixed.cyborg.test.ts',
      `import { test } from '@playwright/test'

test.describe('[CYBORG] Old suite', () => {
  test('[CYBORG] A', async ({ manualStep }) => {
    await manualStep('a')
  })
  test('[CYBORG] B', async ({ manualStep }) => {
    await manualStep('b')
  })
})`
    )

    const result = autoFixTestFile(filePath, mdOf([['A', ['a']]]))

    expect(result.fixed).toBe(true)
    expect(result.changes).toEqual(['Test suite title: "[CYBORG] Old suite" → "[CYBORG] Suite"'])
    expect(result.warnings).toEqual([
      'Extra test case "[CYBORG] B" (not in MD) - manual review needed'
    ])
  })

  it('should follow stable ID when MD title changes and case is inserted before it', () => {
    const filePath = createTSFile(
      'ids.auto.test.ts',
      `import { test } from '@playwright/test'

test.describe('[ts01-AUTO] Suite', () => {
  test('[tc01-AUTO] Old title', async () => {
    await test.step('Step', async () => {})
  })
})`
    )

    autoFixTestFile(filePath, {
      suiteID: 'ts01',
      suiteTtl: 'Suite',
      suiteTags: [],
      testCases: [
        { id: 'tc00', ttl: 'Inserted', stepTtls: ['Step'], tags: [] },
        { id: 'tc01', ttl: 'New title', stepTtls: ['Step'], tags: [] }
      ]
    })

    const parsed = parseTestFile(filePath)
    expect(parsed.testCases.map((tc) => [tc.id, tc.ttl])).toEqual([
      ['tc00-AUTO', 'Inserted'],
      ['tc01-AUTO', 'New title']
    ])
  })
})

describe('autoFixTestFile - spec tags', () => {
  const header = `import test from '@cyborgtests/test'\nimport { TAG } from '@/test-constants/tags'\n\n`
  const md = (suiteTags: string[], caseTags: string[][]): ParsedMD => ({
    suiteID: '',
    suiteTtl: 'Shop',
    suiteTags,
    testCases: caseTags.map((tags, i) => ({
      id: null,
      ttl: `Case ${i + 1}`,
      stepTtls: ['Step'],
      tags
    }))
  })

  it('should add, replace and remove spec tags keeping TAG constants and other details', () => {
    const filePath = createTSFile(
      'shop.cyborg.test.ts',
      `${header}test.describe('[CYBORG] Shop', { tag: [TAG.TEST.CYBORG, TAG.SUITE.SHOP, '@old'] }, () => {
  test('Case 1', async ({ manualStep }) => {
    await manualStep('Step')
  })
  test('Case 2', { tag: ['@old'], annotation: { type: 'issue' } }, async ({ manualStep }) => {
    await manualStep('Step')
  })
  test('Case 3', { tag: '@old' }, async ({ manualStep }) => {
    await manualStep('Step')
  })
})`
    )

    const result = autoFixTestFile(filePath, md(['@shop'], [['@smoke'], ['@new'], []]))
    const parsed = parseTestFile(filePath)

    expect(parsed.tags).toEqual(['TAG.TEST.CYBORG', 'TAG.SUITE.SHOP', '@shop'])
    expect(parsed.testCases.map((tc) => tc.tags)).toEqual([['@smoke'], ['@new'], []])
    expect(fs.readFileSync(filePath, 'utf-8')).toContain("annotation: { type: 'issue' }")
    expect(fs.readFileSync(filePath, 'utf-8')).not.toContain("test('Case 3', {")
    expect(result.changes).toEqual([
      'Test suite tags: [@old] → [@shop]',
      'Test case #1 tags: [] → [@smoke]',
      'Test case #2 tags: [@old] → [@new]',
      'Test case #3 tags: [@old] → []'
    ])
  })

  it('should leave tags in other order unchanged (idempotent)', () => {
    const filePath = createTSFile(
      'order.cyborg.test.ts',
      `${header}test.describe('[CYBORG] Shop', { tag: [TAG.TEST.CYBORG, '@b', '@a'] }, () => {
  test('Case 1', async ({ manualStep }) => {
    await manualStep('Step')
  })
})`
    )

    expect(autoFixTestFile(filePath, md(['@a', '@b'], [[]])).fixed).toBe(false)
  })

  it('should insert missing test case with its tags', () => {
    const filePath = createTSFile(
      'insert.cyborg.test.ts',
      `${header}test.describe('[CYBORG] Shop', { tag: [TAG.TEST.CYBORG] }, () => {
  test('Case 1', async ({ manualStep }) => {
    await manualStep('Step')
  })
})`
    )

    autoFixTestFile(filePath, md([], [[], ['@smoke']]))

    expect(parseTestFile(filePath).testCases[1]).toMatchObject({ ttl: 'Case 2', tags: ['@smoke'] })
  })
})
