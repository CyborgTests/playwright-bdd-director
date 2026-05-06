import { ParsedMd, TestCase as MdTestCase } from './md-parser'
import { ParsedTest, ParsedTestCase as TsTestCase } from './ts-parser'

export interface ValidationResult {
  file: string
  valid: boolean
  errors: string[]
}

/**
 * Check if test ID matches MD ID (with optional suffix in test ID)
 *
 * MD ID is the reference (etalon). Test ID can have suffixes.
 *
 * Examples:
 * - MD: 'TC01-01', Test: 'TC01-01' → ✅ exact match
 * - MD: 'TC01-01', Test: 'TC01-01-MANUAL' → ✅ test has suffix
 * - MD: 'TC01-01', Test: 'TC01-02' → ❌ different IDs
 * - MD: 'TC01', Test: 'TC01-01' → ❌ test is not a suffix variant
 */
function idsMatch(mdId: string, testId: string): boolean {
  if (mdId === testId) return true // Exact match
  if (testId.startsWith(mdId + '-')) return true // Test has suffix after dash
  return false
}

/**
 * Extract ID and title from step text with brackets
 *
 * Examples:
 * - '[01-01-01] Navigate' → { id: '01-01-01', title: 'Navigate' }
 * - '[01-01-01-CHECK] Navigate' → { id: '01-01-01-CHECK', title: 'Navigate' }
 * - 'Navigate' → { id: '', title: 'Navigate' }
 */
function parseStepText(stepText: string): { id: string; title: string } {
  const match = stepText.match(/^\[([^\]]+)\]\s*(.*)/)
  if (match) {
    return { id: match[1].trim(), title: match[2].trim() }
  }
  return { id: '', title: stepText.trim() }
}

/**
 * Validate that test file matches MD file
 */
export function validateSync(testFile: string, mdData: ParsedMd, tsData: ParsedTest): ValidationResult {
  const errors: string[] = []

  // 1. Validate suite title
  if (mdData.suiteTitle !== tsData.suiteTitle) {
    errors.push(`
  Suite title mismatch:
    MD:   "${mdData.suiteTitle}"
    Test: "${tsData.suiteTitle}"

    Fix: test.describe('${mdData.suiteTitle}', ...)
`)
  }

  // 2. Validate test case count
  if (mdData.testCases.length !== tsData.testCases.length) {
    const diff = tsData.testCases.length - mdData.testCases.length
    const action = diff > 0 ? `Remove ${diff} extra test case(s) from test file` : `Add ${Math.abs(diff)} missing test case(s) to test file`
    errors.push(`
  Test case count mismatch:
    MD has ${mdData.testCases.length} test case(s)
    Test has ${tsData.testCases.length} test case(s)

    Fix: ${action}
`)
  }

  // 3. Validate each test case
  const maxCount = Math.max(mdData.testCases.length, tsData.testCases.length)

  for (let i = 0; i < maxCount; i++) {
    const mdTc = mdData.testCases[i]
    const tsTc = tsData.testCases[i]

    if (!mdTc) {
      const tcLabel = tsTc.id ? `[${tsTc.id}] ${tsTc.title}` : tsTc.title
      errors.push(`
  Extra test case in test file:
    Test: ${tcLabel}

    Fix: Remove this test case or add to MD
`)
      continue
    }

    if (!tsTc) {
      const mdLabel = mdTc.id ? `[${mdTc.id}] ${mdTc.title}` : mdTc.title
      const testExample = mdTc.id ? `test('[${mdTc.id}] ${mdTc.title}', ...)` : `test('${mdTc.title}', ...)`
      errors.push(`
  Missing test case in test file:
    MD: ${mdLabel}

    Fix: ${testExample}
`)
      continue
    }

    // Validate test case ID
    // Check if only one side has ID - inconsistency
    if ((mdTc.id && !tsTc.id) || (!mdTc.id && tsTc.id)) {
      errors.push(`
  Test case ${i + 1} ID inconsistency:
    MD:   ${mdTc.id ? `[${mdTc.id}] ${mdTc.title}` : mdTc.title}
    Test: ${tsTc.id ? `[${tsTc.id}] ${tsTc.title}` : tsTc.title}

    ❌ Only one side has ID. Both must have IDs or both must have no IDs.
    Fix: ${mdTc.id ? `test('[${mdTc.id}] ${mdTc.title}', ...)` : `Remove [${tsTc.id}] from test or add to MD: ## [${tsTc.id}] ${mdTc.title}`}
`)
    }

    // MD ID is reference, test ID can have suffixes (only if both have IDs)
    if (mdTc.id && tsTc.id && !idsMatch(mdTc.id, tsTc.id)) {
      errors.push(`
  Test case ${i + 1} ID mismatch:
    MD:   ${mdTc.id}
    Test: ${tsTc.id}

    ❌ Test ID must be '${mdTc.id}' or '${mdTc.id}-SUFFIX'
    Fix: test('[${mdTc.id}] ${mdTc.title}', ...)
`)
    }

    // Validate test case title
    if (mdTc.title !== tsTc.title) {
      const tcLabel = mdTc.id || `#${i + 1}`
      const fixExample = mdTc.id ? `test('[${mdTc.id}] ${mdTc.title}', ...)` : `test('${mdTc.title}', ...)`
      errors.push(`
  Test case ${tcLabel} title mismatch:
    MD:   "${mdTc.title}"
    Test: "${tsTc.title}"

    Fix: ${fixExample}
`)
    }

    // Validate step count
    if (mdTc.stepTitles.length !== tsTc.stepTitles.length) {
      const tcLabel = mdTc.id || mdTc.title
      const diff = tsTc.stepTitles.length - mdTc.stepTitles.length
      const action = diff > 0 ? `Remove ${diff} extra step(s)` : `Add ${Math.abs(diff)} missing step(s)`
      errors.push(`
  Test case ${tcLabel} step count mismatch:
    MD has ${mdTc.stepTitles.length} step(s)
    Test has ${tsTc.stepTitles.length} step(s)

    Fix: ${action}
`)
    }

    // Validate step titles (with ID suffix support)
    const maxSteps = Math.max(mdTc.stepTitles.length, tsTc.stepTitles.length)
    const stepMismatches: string[] = []

    for (let j = 0; j < maxSteps; j++) {
      const mdStepText = mdTc.stepTitles[j]
      const tsStepText = tsTc.stepTitles[j]

      if (!mdStepText || !tsStepText) {
        const fix = !mdStepText
          ? `Remove extra step from test`
          : `Add missing step: manualStep('${mdStepText}')`
        stepMismatches.push(`
    Step ${j + 1}:
      MD:   ${mdStepText ? `"${mdStepText}"` : '(missing)'}
      Test: ${tsStepText ? `"${tsStepText}"` : '(missing)'}
      Fix: ${fix}`)
        continue
      }

      // Parse both steps
      const mdStep = parseStepText(mdStepText)
      const tsStep = parseStepText(tsStepText)

      // Check if only one side has ID - inconsistency
      if ((mdStep.id && !tsStep.id) || (!mdStep.id && tsStep.id)) {
        const fix = mdStep.id
          ? `manualStep('${mdStepText}')`
          : `Remove [${tsStep.id}] from step or add to MD: ### ${tsStepText}`
        stepMismatches.push(`
    Step ${j + 1} ID inconsistency:
      MD:   "${mdStepText}"
      Test: "${tsStepText}"
      ❌ Only one side has ID. Both must have IDs or both must have no IDs.
      Fix: ${fix}`)
        continue
      }

      // Validate step ID (if both have IDs)
      const idsValid = !mdStep.id || !tsStep.id || idsMatch(mdStep.id, tsStep.id)

      // Validate step title
      const titlesValid = mdStep.title === tsStep.title

      if (!idsValid || !titlesValid) {
        stepMismatches.push(`
    Step ${j + 1}:
      MD:   "${mdStepText}"
      Test: "${tsStepText}"${!idsValid ? `\n      ❌ ID must be '${mdStep.id}' or '${mdStep.id}-SUFFIX'` : ''}${!titlesValid ? `\n      ❌ Title must match exactly` : ''}
      Fix: manualStep('${mdStepText}')`)
      }
    }

    if (stepMismatches.length > 0) {
      const tcLabel = mdTc.id || mdTc.title
      errors.push(`
  Test case ${tcLabel} step mismatch:
${stepMismatches.join('\n')}`)
    }
  }

  return {
    file: testFile,
    valid: errors.length === 0,
    errors
  }
}
