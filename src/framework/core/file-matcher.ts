import path from 'path'

import { extractSuiteName, getTagConstant } from '../generation/tags-updater'
import { getTestFileBaseName, matchIDWithSuffix, parseIDAndTitle } from '../utils/helpers'
import { ParsedMD } from './md-parser'
import { ParsedTest } from './ts-parser'

export interface FileMatchResult {
  file: string
  valid: boolean
  errors: string[]
}

/**
 * Format ID for display in error messages
 * - null → "no-id"
 * - "" → "" (empty brackets)
 * - "TC01-01" → "TC01-01"
 */
function formatIdForDisplay(id: string | null): string {
  if (id === null) return 'no-id'
  return id
}

/**
 * Format test case label for error messages
 * Uses ID if present, otherwise shows index number
 */
function formatTestCaseLabel(
  testCase: { id: string | null; ttl: string },
  fallbackIndex?: number
): string {
  if (testCase.id !== null) return `[${testCase.id}] ${testCase.ttl}`
  if (typeof fallbackIndex === 'number') return `#${fallbackIndex + 1} ${testCase.ttl}`
  return testCase.ttl
}

/**
 * Determine test file type from filename
 */
function getFileType(fileName: string): 'manual' | 'auto' | 'hybrid' {
  const lower = fileName.toLowerCase()
  if (lower.includes('.manual.')) return 'manual'
  if (lower.includes('.auto.')) return 'auto'
  return 'hybrid'
}

/**
 * Validate ID field presence and match between MD and TS
 * MD is the source of truth - TS must match MD
 * @returns Error message or null if valid
 */
function validateIdField(mdId: string | null, tsId: string | null, context: string): string | null {
  if (mdId !== null && tsId === null) return `• Missing ${context} in TS (MD has: ${mdId})`
  if (mdId === null && tsId !== null) return `• Unexpected ${context} in TS (MD has no ${context})`
  if (mdId !== null && tsId !== null && !matchIDWithSuffix(mdId, tsId))
    return `• ${context}: ${tsId} → ${mdId}`
  return null
}

/**
 * Validate that test file has required tags based on filename
 * Checks for TEST tag (manual/auto/hybrid) and SUITE tag
 */
function validateTags(testFile: string, tags: string[]): string[] {
  const errors: string[] = []
  const fileName = path.basename(testFile)
  const fileType = getFileType(fileName)

  // Extract expected tags from filename
  const expectedTestTag = `TAG.TEST.${fileType.toUpperCase()}`

  // Extract base name and expected suite tag
  const baseName = getTestFileBaseName(fileName).toLowerCase()
  const suiteName = extractSuiteName(baseName)
  const suiteTagConstant = getTagConstant(suiteName)
  const expectedSuiteTag = `TAG.SUITE.${suiteTagConstant}`

  // Check TEST tag
  if (!tags.includes(expectedTestTag)) {
    errors.push(`• Missing ${expectedTestTag} (file type: ${fileType})`)
  }

  // Check SUITE tag
  if (!tags.includes(expectedSuiteTag)) {
    errors.push(`• Missing ${expectedSuiteTag} (from basename: ${baseName})`)
  }

  // Check for unexpected tags
  const validTags = [expectedTestTag, expectedSuiteTag]
  const unexpectedTags = tags.filter((tag) => !validTags.includes(tag))
  if (unexpectedTags.length > 0) {
    errors.push(`• Unexpected tags: ${unexpectedTags.join(', ')}`)
  }

  return errors
}

/**
 * Validate suite ID and title match between MD and TS
 */
function validateSuite(markdownData: ParsedMD, typeScriptData: ParsedTest): string | null {
  const problems: string[] = []

  const suiteIdError = validateIdField(markdownData.suiteID, typeScriptData.suiteID, 'Suite ID')
  if (suiteIdError) {
    problems.push(suiteIdError)
  }

  if (markdownData.suiteTtl !== typeScriptData.suiteTtl) {
    problems.push(`• Suite Title: "${typeScriptData.suiteTtl}" → "${markdownData.suiteTtl}"`)
  }

  return problems.length > 0 ? `Test Suite Problems:\n  ${problems.join('\n  ')}` : null
}

/**
 * Validate test case count matches between MD and TS
 * Returns error message if counts don't match, null otherwise
 */
function validateTestCaseCount(markdownData: ParsedMD, typeScriptData: ParsedTest): string | null {
  if (markdownData.testCases.length === typeScriptData.testCases.length) {
    return null
  }

  const diff = typeScriptData.testCases.length - markdownData.testCases.length
  const status = diff > 0 ? `${diff} extra in test file` : `${Math.abs(diff)} missing in test file`

  const mdList = markdownData.testCases
    .map((tc, i) => `  ${i + 1}. [${formatIdForDisplay(tc.id)}] ${tc.ttl}`)
    .join('\n')
  const tsList = typeScriptData.testCases
    .map((tc, i) => `  ${i + 1}. [${formatIdForDisplay(tc.id)}] ${tc.ttl}`)
    .join('\n')

  return `❌ Test Case Count Mismatch: ${typeScriptData.testCases.length} in test file → ${markdownData.testCases.length} in MD (${status})\n\nMD has:\n${mdList}\n\nTest file has:\n${tsList}\n\nFix: Update test file to match MD exactly`
}

/**
 * Validate each test case - IDs, titles, and steps
 * Returns array of error messages for all test cases with problems
 */
function validateTestCases(markdownData: ParsedMD, typeScriptData: ParsedTest): string[] {
  const errors: string[] = []
  const maxCount = Math.max(markdownData.testCases.length, typeScriptData.testCases.length)

  for (let i = 0; i < maxCount; i++) {
    const markdownTestCase = markdownData.testCases[i]
    const typeScriptTestCase = typeScriptData.testCases[i]

    // Collect all problems for this test case
    const problems: string[] = []

    if (!markdownTestCase) {
      const label = formatTestCaseLabel(typeScriptTestCase, i)
      errors.push(
        `Test Case #${i + 1}: ${label}\n  ❌ Extra test case (not in MD)\n  Fix: Remove this test case or add it to MD`
      )
      continue
    }

    if (!typeScriptTestCase) {
      const label = formatTestCaseLabel(markdownTestCase, i)
      const testExample =
        markdownTestCase.id !== null
          ? `test(${JSON.stringify(`[${markdownTestCase.id}] ${markdownTestCase.ttl}`)}, ...)`
          : `test(${JSON.stringify(markdownTestCase.ttl)}, ...)`
      errors.push(`Test Case #${i + 1}: ${label}\n  ❌ Missing in test file\n  Fix: ${testExample}`)
      continue
    }

    // Check ID presence and match
    const testCaseIdError = validateIdField(markdownTestCase.id, typeScriptTestCase.id, 'ID')
    if (testCaseIdError) {
      problems.push(testCaseIdError)
    }

    // Check title mismatch
    if (markdownTestCase.ttl !== typeScriptTestCase.ttl) {
      problems.push(`• Title: "${typeScriptTestCase.ttl}" → "${markdownTestCase.ttl}"`)
    }

    // Check step count
    if (markdownTestCase.stepTtls.length !== typeScriptTestCase.stepTtls.length) {
      const diff = typeScriptTestCase.stepTtls.length - markdownTestCase.stepTtls.length
      const status = diff > 0 ? `${diff} extra` : `${Math.abs(diff)} missing`
      problems.push(
        `• Steps: ${typeScriptTestCase.stepTtls.length} → ${markdownTestCase.stepTtls.length} (${status})`
      )
    }

    // Check steps
    const maxSteps = Math.max(markdownTestCase.stepTtls.length, typeScriptTestCase.stepTtls.length)

    for (let j = 0; j < maxSteps; j++) {
      const markdownStepText = markdownTestCase.stepTtls[j]
      const typeScriptStepText = typeScriptTestCase.stepTtls[j]

      if (!markdownStepText) {
        problems.push(`• Step #${j + 1}: extra (not in MD)`)
        continue
      }

      if (!typeScriptStepText) {
        problems.push(`• Step #${j + 1}: missing`)
        continue
      }

      const { id: markdownStepId = '', ttl: markdownStepTtl } = parseIDAndTitle(markdownStepText)
      const { id: typeScriptStepId = '', ttl: typeScriptStepTtl } =
        parseIDAndTitle(typeScriptStepText)

      // Check ID presence and match (MD is source of truth)
      const stepIdError = validateIdField(markdownStepId, typeScriptStepId, `Step #${j + 1} ID`)
      if (stepIdError) {
        problems.push(stepIdError)
      }

      // Check title
      if (markdownStepTtl !== typeScriptStepTtl) {
        problems.push(`• Step #${j + 1}: Title mismatch`)
      }
    }

    // Output compact format if any problems found
    if (problems.length > 0) {
      const tsLabel = formatTestCaseLabel(typeScriptTestCase, i)
      errors.push(`Test Case #${i + 1}: ${tsLabel}\n  Problems:\n  ${problems.join('\n  ')}`)
    }
  }

  return errors
}

/**
 * Match test file against markdown file to validate sync
 * MD is the source of truth - TS must match MD structure
 * Returns validation result with all found errors
 */
export function matchFiles(
  testFile: string,
  markdownData: ParsedMD,
  typeScriptData: ParsedTest
): FileMatchResult {
  const errors: string[] = []

  // 1. Validate tags
  const tagErrors = validateTags(testFile, typeScriptData.tags)
  if (tagErrors.length > 0) {
    errors.push(`Tag Problems:\n  ${tagErrors.join('\n  ')}`)
  }

  // 2. Validate suite
  const suiteError = validateSuite(markdownData, typeScriptData)
  if (suiteError) {
    errors.push(suiteError)
  }

  // 3. Validate test case count - if different, stop here
  const countError = validateTestCaseCount(markdownData, typeScriptData)
  if (countError) {
    errors.push(countError)
    // Don't compare test cases when counts don't match - results are misleading
    return {
      file: testFile,
      valid: false,
      errors
    }
  }

  // 4. Validate each test case
  const testCaseErrors = validateTestCases(markdownData, typeScriptData)
  errors.push(...testCaseErrors)

  return {
    file: testFile,
    valid: errors.length === 0,
    errors
  }
}
