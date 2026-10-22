import path from 'path'

import { extractSuiteName, getTagConstant } from '../generation/tags-updater'
import { getTestFileBaseName, matchIDWithSuffix, parseIDAndTitle } from '../utils/helpers'
import { ExamplesTable, ParsedMD } from './md-parser'
import { ParsedTest } from './ts-parser'

export interface FileMatchResult {
  file: string
  valid: boolean
  errors: string[]
  isCyborgWithTestStep?: boolean
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
function getFileType(fileName: string): 'AUTO' | 'CYBORG' {
  const lower = fileName.toLowerCase()
  if (lower.includes('.cyborg.')) return 'CYBORG'
  return 'AUTO'
}

/**
 * Validate ID field presence and match between MD and TS
 * MD is the source of truth - TS must match MD
 * @returns Error message or null if valid
 */
function validateIdField(mdId: string | null, tsId: string | null, context: string): string | null {
  // Both null - valid (no ID in either)
  if (mdId === null && tsId === null) return null

  // MD has empty brackets [] - TS must have suffix (not null and not empty)
  if (mdId === '' && (tsId === null || tsId === '')) {
    return `• Missing ${context} suffix in TS (MD has [] - use [CYBORG], [AUTO], etc.)`
  }

  // Both empty string - valid (empty ID [] in both)
  if (mdId === '' && tsId === '') return null

  // Both have IDs - check if they match (with suffix support)
  // This handles: mdId='' + tsId='CYBORG', mdId='tc01' + tsId='tc01-CYBORG', etc.
  if (mdId !== null && tsId !== null && matchIDWithSuffix(mdId, tsId)) return null

  // MD has non-empty ID but TS doesn't
  if (mdId !== null && mdId !== '' && tsId === null)
    return `• Missing ${context} in TS (MD has: ${mdId})`

  // TS has ID but MD doesn't (and they don't match via suffix)
  if ((mdId === null || mdId === '') && tsId !== null && tsId !== '')
    return `• Unexpected ${context} in TS (MD has no ${context})`

  // IDs don't match
  if (mdId !== null && tsId !== null) return `• ${context}: ${tsId} → ${mdId}`

  return null
}

/**
 * Validate that test file has required tags based on filename
 * Checks for TEST tag (auto/cyborg) and SUITE tag constants, and spec tags ("@smoke" strings)
 */
function validateTags(testFile: string, allTags: string[], specTags: string[]): string[] {
  const { constants: tags, specTags: tsSpecTags } = splitTags(allTags)
  const errors: string[] = diffSpecTags(tsSpecTags, specTags)
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

  // Allow TYPE tags for auto files (api, ui, e2e)
  if (fileType === 'AUTO') {
    validTags.push('TAG.TYPE.API', 'TAG.TYPE.UI', 'TAG.TYPE.E2E')
  }

  const unexpectedTags = tags.filter((tag) => !validTags.includes(tag))
  if (unexpectedTags.length > 0) {
    errors.push(`• Unexpected tags: ${unexpectedTags.join(', ')}`)
  }

  return errors
}

/**
 * Tags as read by ts-parser: string literals ("@smoke") come from the spec, the rest are
 * TAG.* constants of the framework
 */
export function splitTags(tags: string[]): { constants: string[]; specTags: string[] } {
  return {
    constants: tags.filter((tag) => !tag.startsWith('@')),
    specTags: tags.filter((tag) => tag.startsWith('@'))
  }
}

/**
 * Same examples data: equal columns (any key order) and rows in spec order
 */
export function isSameExamples(actual: ExamplesTable, expected: ExamplesTable): boolean {
  const { columns } = expected
  if (actual.columns.length !== columns.length || actual.rows.length !== expected.rows.length) {
    return false
  }
  if (!columns.every((column) => actual.columns.includes(column))) return false
  return expected.rows.every((row, i) =>
    columns.every((column, j) => actual.rows[i][actual.columns.indexOf(column)] === row[j])
  )
}

/**
 * Parametrized spec case needs inline data equal to its table. A loop in a test of a plain spec
 * case is the test's own business (e.g. iterating fixtures) - not checked.
 */
function diffExamples(actual: ExamplesTable | null, expected: ExamplesTable | null): string | null {
  if (!expected) return null
  if (!actual) {
    return `• Examples: no inline data - expected for (const example of [{ ${expected.columns[0]}: '…' }]) around test`
  }
  if (isSameExamples(actual, expected)) return null
  return `• Examples: data differs from spec table (${actual.rows.length} rows → ${expected.rows.length})`
}

/**
 * Spec tags of a test / describe must be exactly the spec ones (order does not matter)
 */
function diffSpecTags(actual: string[], expected: string[]): string[] {
  return [
    ...expected.filter((tag) => !actual.includes(tag)).map((tag) => `• Missing tag '${tag}'`),
    ...actual
      .filter((tag) => !expected.includes(tag))
      .map((tag) => `• Unexpected tag '${tag}' (not in spec)`)
  ]
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
 * Check if manual test file has test.step calls
 * Manual tests with test.step should skip step validation
 */
function hasTestStepCalls(typeScriptData: ParsedTest): boolean {
  for (const testCase of typeScriptData.testCases) {
    // Check if any step is test.step (not just manualStep)
    for (const kind of testCase.stepCallKinds) {
      if (kind === 'test.step') {
        return true
      }
    }
  }
  return false
}

/**
 * Validate each test case - IDs, titles, and steps
 * Returns array of error messages for all test cases with problems
 */
function validateTestCases(
  markdownData: ParsedMD,
  typeScriptData: ParsedTest,
  isManualWithTestStep: boolean = false
): string[] {
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

    // Hook implementation takes no tags - it runs with any selected test of the suite
    problems.push(
      ...(typeScriptTestCase.isHook
        ? []
        : diffSpecTags(splitTags(typeScriptTestCase.tags).specTags, markdownTestCase.tags))
    )

    const examplesProblem = diffExamples(typeScriptTestCase.examples, markdownTestCase.examples)
    if (examplesProblem) problems.push(examplesProblem)

    // Check step count
    if (markdownTestCase.stepTtls.length !== typeScriptTestCase.stepTtls.length) {
      const diff = typeScriptTestCase.stepTtls.length - markdownTestCase.stepTtls.length
      const status = diff > 0 ? `${diff} extra` : `${Math.abs(diff)} missing`
      problems.push(
        `• Steps: ${typeScriptTestCase.stepTtls.length} → ${markdownTestCase.stepTtls.length} (${status})`
      )
    }

    // Output problems before skipping detailed step validation
    if (isManualWithTestStep) {
      if (problems.length > 0) {
        const tsLabel = formatTestCaseLabel(typeScriptTestCase, i)
        errors.push(`Test Case #${i + 1}: ${tsLabel}\n  Problems:\n  ${problems.join('\n  ')}`)
      }
      continue
    }

    // Check steps (detailed validation)
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
  const tagErrors = validateTags(testFile, typeScriptData.tags, markdownData.suiteTags)
  if (tagErrors.length > 0) {
    errors.push(`Tag Problems:\n  ${tagErrors.join('\n  ')}`)
  }

  // 2. Validate suite
  const suiteError = validateSuite(markdownData, typeScriptData)
  if (suiteError) {
    errors.push(suiteError)
  }

  // 3. Validate test case count - if different, stop here
  const fileType = getFileType(testFile)
  const cyborgWithTestStep = fileType === 'CYBORG' && hasTestStepCalls(typeScriptData)
  const countError = validateTestCaseCount(markdownData, typeScriptData)
  if (countError) {
    errors.push(countError)
    // Don't compare test cases when counts don't match - results are misleading
    return {
      file: testFile,
      valid: false,
      errors,
      isCyborgWithTestStep: cyborgWithTestStep
    }
  }

  // 4. Validate each test case
  // Skip step validation for cyborg tests with test.step - they are intentionally structured
  const testCaseErrors = validateTestCases(markdownData, typeScriptData, cyborgWithTestStep)
  errors.push(...testCaseErrors)

  return {
    file: testFile,
    valid: errors.length === 0,
    errors,
    isCyborgWithTestStep: cyborgWithTestStep
  }
}
