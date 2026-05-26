import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseTestFile } from '@/framework/core/ts-parser'
import { resetSharedProject } from '@/framework/utils/ts-morph-helpers'

// Generate unique test directory for each test
let testDir: string

beforeEach(() => {
  // Reset ts-morph project to release file locks
  resetSharedProject()

  // Create unique directory with random suffix
  const randomSuffix = crypto.randomBytes(4).toString('hex')
  testDir = path.join(process.cwd(), `.test-tmp-ts-${randomSuffix}`)
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

describe('parseTestFile', () => {
  describe('suite parsing with IDs', () => {
    it('should parse suite with ID', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01] Test Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Test case', async () => {
    await test.step('Step 1', async () => {})
  })
})`
      const filePath = createTSFile('suite-with-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe('ts01')
      expect(result.suiteTtl).toBe('Test Suite')
    })

    it('should parse suite with empty ID []', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[] Test Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('suite-empty-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe('')
      expect(result.suiteTtl).toBe('Test Suite')
    })

    it('should parse suite without ID', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Test Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('suite-no-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe(null)
      expect(result.suiteTtl).toBe('Test Suite')
    })

    it('should parse suite with suffix (ts01-auto)', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts01-auto] Test Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('suite-with-suffix.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe('ts01-auto')
      expect(result.suiteTtl).toBe('Test Suite')
    })
  })

  describe('test case parsing', () => {
    it('should parse test case with ID', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Test case title', async () => {})
})`
      const filePath = createTSFile('test-with-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(1)
      expect(result.testCases[0].id).toBe('tc-01')
      expect(result.testCases[0].ttl).toBe('Test case title')
    })

    it('should parse test case with empty ID []', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[] Test case', async () => {})
})`
      const filePath = createTSFile('test-empty-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].id).toBe('')
      expect(result.testCases[0].ttl).toBe('Test case')
    })

    it('should parse test case without ID', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case without ID', async () => {})
})`
      const filePath = createTSFile('test-no-id.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].id).toBe(null)
      expect(result.testCases[0].ttl).toBe('Test case without ID')
    })

    it('should parse test case with suffix (tc-01-auto)', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01-auto] Test case', async () => {})
})`
      const filePath = createTSFile('test-with-suffix.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].id).toBe('tc-01-auto')
      expect(result.testCases[0].ttl).toBe('Test case')
    })

    it('should parse suffix-only ID (MANUAL, AUTO, HYBRID)', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TEST] }, () => {
  test('[MANUAL] Test case', async () => {})
})`
      const filePath = createTSFile('test-suffix-only.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].id).toBe('MANUAL')
      expect(result.testCases[0].ttl).toBe('Test case')
    })

    it('should parse multiple test cases', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] First test', async () => {})
  test('[tc-02] Second test', async () => {})
  test('[tc-03] Third test', async () => {})
})`
      const filePath = createTSFile('multiple-tests.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(3)
      expect(result.testCases[0].id).toBe('tc-01')
      expect(result.testCases[1].id).toBe('tc-02')
      expect(result.testCases[2].id).toBe('tc-03')
    })
  })

  describe('step parsing', () => {
    it('should parse test.step calls', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {
    await test.step('Step 1', async () => {})
    await test.step('Step 2', async () => {})
  })
})`
      const filePath = createTSFile('test-steps.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual(['Step 1', 'Step 2'])
      expect(result.testCases[0].stepCallKinds).toEqual(['test.step', 'test.step'])
    })

    it('should parse manualStep calls', () => {
      const content = `import test from '@cyborgtests/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TEST] }, () => {
  test('Test case', async ({ manualStep }) => {
    await manualStep('Manual step 1')
    await manualStep('Manual step 2')
  })
})`
      const filePath = createTSFile('manual-steps.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual(['Manual step 1', 'Manual step 2'])
      expect(result.testCases[0].stepCallKinds).toEqual(['manualStep', 'manualStep'])
    })

    it('should parse steps with IDs', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {
    await test.step('[step-01] First step', async () => {})
    await test.step('[step-02] Second step', async () => {})
  })
})`
      const filePath = createTSFile('steps-with-ids.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual([
        '[step-01] First step',
        '[step-02] Second step'
      ])
    })

    it('should parse test case without steps', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test without steps', async () => {
    // No steps
  })
})`
      const filePath = createTSFile('no-steps.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual([])
      expect(result.testCases[0].stepCallKinds).toEqual([])
    })

    it('should parse mixed step types', () => {
      const content = `import test from '@cyborgtests/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.HYBRID, TAG.SUITE.TEST] }, () => {
  test('Test case', async ({ manualStep }) => {
    await test.step('Auto step', async () => {})
    await manualStep('Manual step')
    await test.step('Another auto step', async () => {})
  })
})`
      const filePath = createTSFile('mixed-steps.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases[0].stepTtls).toEqual([
        'Auto step',
        'Manual step',
        'Another auto step'
      ])
      expect(result.testCases[0].stepCallKinds).toEqual(['test.step', 'manualStep', 'test.step'])
    })
  })

  describe('tag extraction', () => {
    it('should extract tags from test.describe with 3 args', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('tags-3-args.ts', content)

      const result = parseTestFile(filePath)

      expect(result.tags).toEqual(['TAG.TEST.AUTO', 'TAG.SUITE.TEST'])
    })

    it('should return empty tags for test.describe with 2 args', () => {
      const content = `import { test } from '@playwright/test'

test.describe('Suite', () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('tags-2-args.ts', content)

      const result = parseTestFile(filePath)

      expect(result.tags).toEqual([])
    })

    it('should extract single tag', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('single-tag.ts', content)

      const result = parseTestFile(filePath)

      expect(result.tags).toEqual(['TAG.TEST.AUTO'])
    })

    it('should extract multiple tags', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.MANUAL, TAG.SUITE.AUTH, TAG.SCOPE.SMOKE] }, () => {
  test('Test case', async () => {})
})`
      const filePath = createTSFile('multiple-tags.ts', content)

      const result = parseTestFile(filePath)

      expect(result.tags).toEqual(['TAG.TEST.MANUAL', 'TAG.SUITE.AUTH', 'TAG.SCOPE.SMOKE'])
    })
  })

  describe('error cases', () => {
    it('should throw error when no test.describe found', () => {
      const content = `import { test } from '@playwright/test'

// No test.describe
test('Test case', async () => {})`
      const filePath = createTSFile('no-describe.ts', content)

      expect(() => parseTestFile(filePath)).toThrow('No test.describe() found')
    })

    it('should throw error when no test cases found', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  // No test cases
})`
      const filePath = createTSFile('no-tests.ts', content)

      expect(() => parseTestFile(filePath)).toThrow('No test cases found')
    })

    it('should throw error for duplicate test case IDs', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] First test', async () => {})
  test('[tc-01] Duplicate ID', async () => {})
})`
      const filePath = createTSFile('duplicate-ids.ts', content)

      expect(() => parseTestFile(filePath)).toThrow('Duplicate test case IDs')
      expect(() => parseTestFile(filePath)).toThrow('[tc-01]')
    })

    it('should allow suffix-only duplicate IDs (manual, auto)', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TEST] }, () => {
  test('[MANUAL] First test', async () => {})
  test('[MANUAL] Second test', async () => {})
})`
      const filePath = createTSFile('suffix-duplicates.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(2)
      expect(result.testCases[0].id).toBe('MANUAL')
      expect(result.testCases[1].id).toBe('MANUAL')
    })

    it('should allow empty ID duplicates', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[] First test', async () => {})
  test('[] Second test', async () => {})
})`
      const filePath = createTSFile('empty-id-duplicates.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(2)
      expect(result.testCases[0].id).toBe('')
      expect(result.testCases[1].id).toBe('')
    })

    it('should allow null ID duplicates', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('First test', async () => {})
  test('Second test', async () => {})
})`
      const filePath = createTSFile('null-id-duplicates.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(2)
      expect(result.testCases[0].id).toBe(null)
      expect(result.testCases[1].id).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('should handle test.only', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test.only('[tc-01] Only test', async () => {})
})`
      const filePath = createTSFile('test-only.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(1)
      expect(result.testCases[0].id).toBe('tc-01')
    })

    it('should handle test.skip', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test.skip('[tc-01] Skipped test', async () => {})
})`
      const filePath = createTSFile('test-skip.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(1)
      expect(result.testCases[0].id).toBe('tc-01')
    })

    it('should handle test.fixme', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test.fixme('[tc-01] Fixme test', async () => {})
})`
      const filePath = createTSFile('test-fixme.ts', content)

      const result = parseTestFile(filePath)

      expect(result.testCases).toHaveLength(1)
      expect(result.testCases[0].id).toBe('tc-01')
    })

    it('should handle complex IDs with multiple dashes', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('[ts-01-complex] Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01-02-03-auto] Test', async () => {
    await test.step('[step-01-02-03] Step', async () => {})
  })
})`
      const filePath = createTSFile('complex-ids.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe('ts-01-complex')
      expect(result.testCases[0].id).toBe('tc-01-02-03-auto')
      expect(result.testCases[0].stepTtls[0]).toBe('[step-01-02-03] Step')
    })

    it('should handle Unicode characters in titles', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Тестовий набір', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Тест кейс 日本語', async () => {
    await test.step('Крок №1 🎯', async () => {})
  })
})`
      const filePath = createTSFile('unicode.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteTtl).toBe('Тестовий набір')
      expect(result.testCases[0].ttl).toBe('Тест кейс 日本語')
      expect(result.testCases[0].stepTtls[0]).toBe('Крок №1 🎯')
    })

    it('should handle brackets in titles', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe('Suite [important]', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('Test [critical] case', async () => {
    await test.step('Step [action]', async () => {})
  })
})`
      const filePath = createTSFile('brackets-in-title.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteTtl).toBe('Suite [important]')
      expect(result.testCases[0].ttl).toBe('Test [critical] case')
      expect(result.testCases[0].stepTtls[0]).toBe('Step [action]')
    })

    it('should handle test.describe.skip', () => {
      const content = `import { test } from '@playwright/test'
import { TAG } from '@/constants/tags'

test.describe.skip('[ts01] Skipped Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TEST] }, () => {
  test('[tc-01] Test case', async () => {})
})`
      const filePath = createTSFile('describe-skip.ts', content)

      const result = parseTestFile(filePath)

      expect(result.suiteID).toBe('ts01')
      expect(result.suiteTtl).toBe('Skipped Suite')
      expect(result.testCases).toHaveLength(1)
    })
  })
})
