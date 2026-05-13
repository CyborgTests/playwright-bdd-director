import { describe, expect, it } from 'vitest'

import { matchFiles } from './file-matcher'
import type { ParsedMD } from './md-parser'
import type { ParsedTest } from './ts-parser'

// Test data factories
function createMD(overrides?: Partial<ParsedMD>): ParsedMD {
  return {
    suiteID: 'TS01',
    suiteTtl: 'Test Suite',
    testCases: [
      {
        id: 'TC-01',
        ttl: 'Test case 1',
        stepTtls: ['[STEP-01] Step 1', '[STEP-02] Step 2']
      }
    ],
    ...overrides
  }
}

function createTS(overrides?: Partial<ParsedTest>): ParsedTest {
  return {
    suiteID: 'TS01',
    suiteTtl: 'Test Suite',
    tags: ['TAG.TEST.AUTO', 'TAG.SUITE.TEST_SUITE'],
    testCases: [
      {
        id: 'TC-01',
        ttl: 'Test case 1',
        stepTtls: ['[STEP-01] Step 1', '[STEP-02] Step 2'],
        stepCallKinds: ['test.step', 'test.step']
      }
    ],
    ...overrides
  }
}

describe('matchFiles', () => {
  describe('perfect match', () => {
    it('should validate when MD and TS match perfectly', () => {
      const md = createMD()
      const ts = createTS()

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate manual test file', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.TEST.MANUAL', 'TAG.SUITE.TEST_SUITE']
      })

      const result = matchFiles('tests/test-suite.manual.test.ts', md, ts)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate hybrid test file', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.TEST.HYBRID', 'TAG.SUITE.TEST_SUITE']
      })

      const result = matchFiles('tests/test-suite.hybrid.test.ts', md, ts)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('suite validation', () => {
    it('should detect suite ID mismatch', () => {
      const md = createMD({ suiteID: 'TS01' })
      const ts = createTS({ suiteID: 'TS02' })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Suite ID')
      expect(result.errors[0]).toContain('TS02')
      expect(result.errors[0]).toContain('TS01')
    })

    it('should detect suite title mismatch', () => {
      const md = createMD({ suiteTtl: 'Correct Title' })
      const ts = createTS({ suiteTtl: 'Wrong Title' })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Suite Title')
      expect(result.errors[0]).toContain('Wrong Title')
      expect(result.errors[0]).toContain('Correct Title')
    })

    it('should detect missing suite ID in TS', () => {
      const md = createMD({ suiteID: 'TS01' })
      const ts = createTS({ suiteID: null })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Missing Suite ID in TS')
    })

    it('should detect unexpected suite ID in TS', () => {
      const md = createMD({ suiteID: '' })
      const ts = createTS({ suiteID: 'TS01' })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Suite ID'))).toBe(true)
    })

    it('should validate suite ID with suffix (TS01 → TS01-AUTO)', () => {
      const md = createMD({ suiteID: 'TS01' })
      const ts = createTS({ suiteID: 'TS01-AUTO' })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      // Should be valid (suffix matching)
      expect(result.valid).toBe(true)
    })
  })

  describe('tag validation', () => {
    it('should detect missing TEST tag', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.SUITE.TEST_SUITE'] // missing TAG.TEST.AUTO
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Missing TAG.TEST.AUTO')
    })

    it('should detect missing SUITE tag', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.TEST.AUTO'] // missing TAG.SUITE.TEST_SUITE
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Missing TAG.SUITE.TEST_SUITE')
    })

    it('should detect unexpected tags', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.TEST.AUTO', 'TAG.SUITE.TEST_SUITE', 'TAG.EXTRA.UNEXPECTED']
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Unexpected tags')
      expect(result.errors[0]).toContain('TAG.EXTRA.UNEXPECTED')
    })

    it('should detect wrong file type tag (manual → auto)', () => {
      const md = createMD()
      const ts = createTS({
        tags: ['TAG.TEST.MANUAL', 'TAG.SUITE.TEST_SUITE']
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Missing TAG.TEST.AUTO')
    })
  })

  describe('test case count validation', () => {
    it('should detect extra test cases in TS', () => {
      const md = createMD({
        testCases: [
          { id: 'TC-01', ttl: 'Test 1', stepTtls: [] },
          { id: 'TC-02', ttl: 'Test 2', stepTtls: [] }
        ]
      })
      const ts = createTS({
        testCases: [
          { id: 'TC-01', ttl: 'Test 1', stepTtls: [], stepCallKinds: [] },
          { id: 'TC-02', ttl: 'Test 2', stepTtls: [], stepCallKinds: [] },
          { id: 'TC-03', ttl: 'Test 3', stepTtls: [], stepCallKinds: [] }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Test Case Count Mismatch'))).toBe(true)
      expect(result.errors.some((e) => e.includes('1 extra in test file'))).toBe(true)
    })

    it('should detect missing test cases in TS', () => {
      const md = createMD({
        testCases: [
          { id: 'TC-01', ttl: 'Test 1', stepTtls: [] },
          { id: 'TC-02', ttl: 'Test 2', stepTtls: [] }
        ]
      })
      const ts = createTS({
        testCases: [{ id: 'TC-01', ttl: 'Test 1', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Test Case Count Mismatch'))).toBe(true)
      expect(result.errors.some((e) => e.includes('1 missing in test file'))).toBe(true)
    })

    it('should not validate individual test cases when count mismatches', () => {
      const md = createMD({
        testCases: [{ id: 'TC-01', ttl: 'Test 1', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [
          { id: 'TC-01', ttl: 'Wrong Title', stepTtls: [], stepCallKinds: [] },
          { id: 'TC-02', ttl: 'Test 2', stepTtls: [], stepCallKinds: [] }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      // Should only have count mismatch error, not individual test case validation errors
      expect(result.errors.length).toBe(1) // count error only (tags are valid)
      expect(result.errors.some((e) => e.includes('Test Case Count Mismatch'))).toBe(true)
      // Should NOT have individual validation errors like "Title:" or "Problems:"
      expect(
        result.errors.some((e) => e.includes('Test Case #1:') && e.includes('Problems:'))
      ).toBe(false)
    })
  })

  describe('test case validation', () => {
    it('should detect test case ID mismatch', () => {
      const md = createMD({
        testCases: [{ id: 'TC-01', ttl: 'Test', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: 'TC-02', ttl: 'Test', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Test Case') && e.includes('ID'))).toBe(true)
    })

    it('should detect test case title mismatch', () => {
      const md = createMD({
        testCases: [{ id: 'TC-01', ttl: 'Correct Title', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: 'TC-01', ttl: 'Wrong Title', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Title'))).toBe(true)
      expect(result.errors.some((e) => e.includes('Wrong Title'))).toBe(true)
      expect(result.errors.some((e) => e.includes('Correct Title'))).toBe(true)
    })

    it('should validate test case ID with suffix (TC-01 → TC-01-AUTO)', () => {
      const md = createMD({
        testCases: [{ id: 'TC-01', ttl: 'Test', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: 'TC-01-AUTO', ttl: 'Test', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
    })

    it('should handle test cases without IDs', () => {
      const md = createMD({
        testCases: [{ id: null, ttl: 'Test without ID', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: null, ttl: 'Test without ID', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
    })

    it('should handle test cases with empty IDs', () => {
      const md = createMD({
        testCases: [{ id: '', ttl: 'Test with empty ID', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: 'AUTO', ttl: 'Test with empty ID', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      // Empty ID in MD, suffix-only in TS - valid
      expect(result.valid).toBe(true)
    })
  })

  describe('step validation', () => {
    it('should detect extra steps in TS', () => {
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step 1', 'Step 2']
          }
        ]
      })
      const ts = createTS({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step 1', 'Step 2', 'Step 3'],
            stepCallKinds: ['test.step', 'test.step', 'test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Steps: 3 → 2'))).toBe(true)
      expect(result.errors.some((e) => e.includes('1 extra'))).toBe(true)
    })

    it('should detect missing steps in TS', () => {
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step 1', 'Step 2', 'Step 3']
          }
        ]
      })
      const ts = createTS({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step 1', 'Step 2'],
            stepCallKinds: ['test.step', 'test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Steps: 2 → 3'))).toBe(true)
      expect(result.errors.some((e) => e.includes('1 missing'))).toBe(true)
    })

    it('should detect step ID mismatch', () => {
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['[STEP-01] Step 1']
          }
        ]
      })
      const ts = createTS({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['[STEP-02] Step 1'],
            stepCallKinds: ['test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Step #1 ID'))).toBe(true)
    })

    it('should detect step title mismatch', () => {
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['[STEP-01] Correct Step']
          }
        ]
      })
      const ts = createTS({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['[STEP-01] Wrong Step'],
            stepCallKinds: ['test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Step #1: Title mismatch'))).toBe(true)
    })

    it('should handle steps without IDs', () => {
      const md = createMD({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step without ID']
          }
        ]
      })
      const ts = createTS({
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Test',
            stepTtls: ['Step without ID'],
            stepCallKinds: ['test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
    })
  })

  describe('multiple errors', () => {
    it('should collect all errors', () => {
      const md = createMD({
        suiteID: 'TS01',
        suiteTtl: 'Correct Suite',
        testCases: [
          {
            id: 'TC-01',
            ttl: 'Correct Test',
            stepTtls: ['Correct Step']
          }
        ]
      })
      const ts = createTS({
        suiteID: 'TS02',
        suiteTtl: 'Wrong Suite',
        tags: ['TAG.TEST.MANUAL'], // wrong + missing SUITE tag
        testCases: [
          {
            id: 'TC-02',
            ttl: 'Wrong Test',
            stepTtls: ['Wrong Step'],
            stepCallKinds: ['test.step']
          }
        ]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(2)
      expect(result.errors.some((e) => e.includes('Suite ID'))).toBe(true)
      expect(result.errors.some((e) => e.includes('Suite Title'))).toBe(true)
      expect(result.errors.some((e) => e.includes('Tag Problems'))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty test case arrays', () => {
      const md = createMD({ testCases: [] })
      const ts = createTS({ testCases: [] })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
    })

    it('should handle test cases with empty step arrays', () => {
      const md = createMD({
        testCases: [{ id: 'TC-01', ttl: 'Test', stepTtls: [] }]
      })
      const ts = createTS({
        testCases: [{ id: 'TC-01', ttl: 'Test', stepTtls: [], stepCallKinds: [] }]
      })

      const result = matchFiles('tests/test-suite.auto.test.ts', md, ts)

      expect(result.valid).toBe(true)
    })

    it('should include file path in result', () => {
      const md = createMD()
      const ts = createTS()
      const filePath = 'tests/my-custom-path/test-suite.auto.test.ts'

      const result = matchFiles(filePath, md, ts)

      expect(result.file).toBe(filePath)
    })

    it('should handle complex nested file paths', () => {
      const md = createMD()
      const ts = createTS()

      const result = matchFiles('tests/auth/login/main.auto.test.ts', md, ts)

      // Should still validate tags based on basename
      expect(result.valid).toBe(false) // Will fail because suite tag extraction
    })
  })
})
