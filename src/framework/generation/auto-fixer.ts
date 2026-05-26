import { CallExpression, Node, SyntaxKind } from 'ts-morph'

import { ParsedMD } from '../core/md-parser'
import { matchIDWithSuffix, parseIDAndTitle } from '../utils/helpers'
import { getIcon } from '../utils/icons'
import {
  findDescribeCall,
  findStepCalls,
  findTestCalls,
  getSharedProject,
  getStringLiteralValue
} from '../utils/ts-morph-helpers'

export interface AutoFixResult {
  filePath: string
  fixed: boolean
  changes: string[]
}

/**
 * Check if manual test file has any test.step calls
 * Manual tests with test.step should not be auto-updated
 */
function hasTestStepInManualTest(testFilePath: string, describeCall: CallExpression): boolean {
  // Only check manual test files
  if (!testFilePath.includes('.manual.')) return false

  const testCalls = findTestCalls(describeCall)
  for (const testCall of testCalls) {
    const stepCalls = findStepCalls(testCall)
    // Check if any step is test.step (not just manualStep)
    for (const stepCall of stepCalls) {
      const expression = stepCall.getExpression().getText()
      if (expression.endsWith('.step')) {
        return true
      }
    }
  }
  return false
}

/**
 * Auto-fix test file to match MD specification
 * Uses ts-morph for safe AST-based code modification
 */
export function autoFixTestFile(testFilePath: string, mdData: ParsedMD): AutoFixResult {
  const changes: string[] = []
  const project = getSharedProject()
  const sourceFile = project.addSourceFileAtPath(testFilePath)

  // 1. Find describe call
  const describeCall = findDescribeCall(sourceFile)
  if (!describeCall) {
    return { filePath: testFilePath, fixed: false, changes: [] }
  }

  // 2. Skip manual tests with test.step - they are intentionally structured
  if (hasTestStepInManualTest(testFilePath, describeCall)) {
    return {
      filePath: testFilePath,
      fixed: false,
      changes: ['Skipped: Manual test with test.step - manual review needed']
    }
  }

  // 3. Fix suite ttl
  fixSuiteTtl(describeCall, mdData, changes)

  // 4. Fix test cases
  fixTestCases(describeCall, mdData, changes)

  // 5. Save changes if any were made
  if (changes.length > 0) {
    sourceFile.formatText() // Auto-format with Prettier-like formatting
    sourceFile.saveSync()
    return { filePath: testFilePath, fixed: true, changes }
  }

  return { filePath: testFilePath, fixed: false, changes: [] }
}

/**
 * Fix test.describe() suite ttl to match MD
 */
function fixSuiteTtl(describeCall: CallExpression, mdData: ParsedMD, changes: string[]): boolean {
  const currentTtl = getStringLiteralValue(describeCall, 0)
  const expectedTtl =
    mdData.suiteID !== null ? `[${mdData.suiteID}] ${mdData.suiteTtl}` : mdData.suiteTtl

  if (currentTtl) {
    // Check if titles match (considering ID suffixes like -AUTO, -MANUAL)
    let titlesMatch = currentTtl === expectedTtl

    if (!titlesMatch) {
      const currentParsed = parseIDAndTitle(currentTtl)
      const expectedParsed = parseIDAndTitle(expectedTtl)

      if (currentParsed.id !== null && expectedParsed.id !== null) {
        const idsMatch = matchIDWithSuffix(expectedParsed.id, currentParsed.id)
        const ttlsMatchParsed = currentParsed.ttl === expectedParsed.ttl
        titlesMatch = idsMatch && ttlsMatchParsed
      }
    }

    if (!titlesMatch) {
      const ttlArg = describeCall.getArguments()[0]
      if (ttlArg) {
        const newTtl = preserveSuffix(currentTtl, expectedTtl)
        ttlArg.replaceWithText(`'${escapeString(newTtl)}'`)
        changes.push(`Test suite title: "${currentTtl}" → "${newTtl}"`)
        return true
      }
    }
  }

  return false
}

/**
 * Fix test cases to match MD specification
 */
function fixTestCases(describeCall: CallExpression, mdData: ParsedMD, changes: string[]): void {
  const testCalls = findTestCalls(describeCall)

  for (let i = 0; i < Math.max(testCalls.length, mdData.testCases.length); i++) {
    const testCall = testCalls[i]
    const mdTestCase = mdData.testCases[i]

    if (!mdTestCase) {
      // Extra test in code - skip (don't auto-delete)
      changes.push(`${getIcon('warning')}  Extra test case #${i + 1} - manual review needed`)
      continue
    }

    if (!testCall) {
      // Missing test in code - skip (don't auto-generate)
      changes.push(
        `${getIcon('warning')}  Missing test case #${i + 1}: "${mdTestCase.ttl}" - manual addition needed`
      )
      continue
    }

    // Fix test case ttl
    const currentTtl = getStringLiteralValue(testCall, 0) ?? ''
    const expectedTtl =
      mdTestCase.id !== null ? `[${mdTestCase.id}] ${mdTestCase.ttl}` : mdTestCase.ttl

    if (currentTtl) {
      // Check if titles match (considering ID suffixes like -AUTO, -MANUAL)
      let titlesMatch = currentTtl === expectedTtl

      if (!titlesMatch) {
        const currentParsed = parseIDAndTitle(currentTtl)
        const expectedParsed = parseIDAndTitle(expectedTtl)

        if (currentParsed.id !== null && expectedParsed.id !== null) {
          const idsMatch = matchIDWithSuffix(expectedParsed.id, currentParsed.id)
          const ttlsMatchParsed = currentParsed.ttl === expectedParsed.ttl
          titlesMatch = idsMatch && ttlsMatchParsed
        }
      }

      if (!titlesMatch) {
        const ttlArg = testCall.getArguments()[0]
        if (ttlArg) {
          const newTtl = preserveSuffix(currentTtl, expectedTtl)
          ttlArg.replaceWithText(`'${escapeString(newTtl)}'`)
          changes.push(`Test case #${i + 1} title: "${currentTtl}" → "${newTtl}"`)
        }
      }
    }

    // Fix test steps
    fixTestSteps(testCall, mdTestCase.stepTtls, changes, i + 1)
  }
}

/**
 * Fix test steps to match MD specification
 */
function fixTestSteps(
  testCall: CallExpression,
  expectedSteps: string[],
  changes: string[],
  testCaseIndex: number
): void {
  const stepCalls = findStepCalls(testCall)

  for (let j = 0; j < Math.max(stepCalls.length, expectedSteps.length); j++) {
    const stepCall = stepCalls[j]
    const expectedStep = expectedSteps[j]

    if (!expectedStep) {
      // Extra step - skip (don't auto-delete)
      changes.push(
        `  ${getIcon('warning')}  TC#${testCaseIndex} Step#${j + 1} extra - manual review needed`
      )
      continue
    }

    if (!stepCall) {
      // Missing step - add it as a placeholder
      const callback = testCall.getArguments()[1]
      if (callback && callback.asKind(SyntaxKind.ArrowFunction)) {
        const arrowFn = callback.asKind(SyntaxKind.ArrowFunction)
        const body = arrowFn?.getBody()
        if (body && Node.isBlock(body)) {
          const block = body.asKind(SyntaxKind.Block)
          if (block) {
            // Add new step at the end
            const newStepCode = `  await test.step('${escapeString(expectedStep)}', async () => {\n    // TODO: Implement step\n  })\n`
            block.addStatements(newStepCode)
            changes.push(
              `  TC#${testCaseIndex} Step#${j + 1}: Added "${expectedStep}" (placeholder)`
            )
            continue
          }
        }
      }
      // Fallback if can't add
      changes.push(
        `  ${getIcon('warning')}  TC#${testCaseIndex} Step#${j + 1} missing: "${expectedStep}"`
      )
      continue
    }

    // Fix step ttl
    const currentStep = getStringLiteralValue(stepCall, 0) ?? ''

    if (currentStep && currentStep !== expectedStep) {
      const stepArg = stepCall.getArguments()[0]
      if (stepArg) {
        stepArg.replaceWithText(`'${escapeString(expectedStep)}'`)
        changes.push(`  TC#${testCaseIndex} Step#${j + 1}: "${currentStep}" → "${expectedStep}"`)
      }
    }
  }
}

/**
 * Escape string for safe insertion into code
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

/**
 * Preserve suffix from current title when applying expected title
 * Examples:
 *   - current="[ts01-AUTO] Old", expected="[ts01] New" → "[ts01-AUTO] New" (non-empty ID)
 *   - current="[AUTO] Old", expected="[] New" → "[AUTO] New" (empty ID)
 */
function preserveSuffix(currentTtl: string, expectedTtl: string): string {
  // Match both non-empty IDs [TC01] and empty IDs []
  const currentMatch = currentTtl.match(/^\[([^\]]*)\]\s*(.*)$/)
  const expectedMatch = expectedTtl.match(/^\[([^\]]*)\]\s*(.*)$/)

  if (currentMatch && expectedMatch) {
    const currentId = currentMatch[1]
    const expectedId = expectedMatch[1]
    const expectedText = expectedMatch[2]

    // Special case: Empty ID [] with suffix-only (MANUAL, AUTO, HYBRID)
    // Example: current="[MANUAL] Old", expected="[] New" → "[MANUAL] New"
    if (expectedId === '' && currentId !== '' && !currentId.includes('-')) {
      return `[${currentId}] ${expectedText}`
    }

    // Regular case: Non-empty ID with dash-based suffix
    // Example: current="[tc01-AUTO] Old", expected="[tc01] New" → "[tc01-AUTO] New"
    if (currentId !== expectedId && currentId.startsWith(expectedId + '-')) {
      return `[${currentId}] ${expectedText}`
    }
  }

  // No suffix or no IDs - return expected as-is
  return expectedTtl
}

/**
 * Check if automated test file contains only empty/TODO steps (no real implementation)
 * Empty-code autotests can be safely auto-updated when MD spec changes
 * @returns true if all steps are empty or contain only comments
 */
export function isEmptyAutoTest(testFilePath: string): boolean {
  const project = getSharedProject()
  const sourceFile = project.addSourceFileAtPath(testFilePath)

  const describeCall = findDescribeCall(sourceFile)
  if (!describeCall) return false

  const testCalls = findTestCalls(describeCall)
  if (testCalls.length === 0) return false

  // Check all test cases
  for (const testCall of testCalls) {
    const stepCalls = findStepCalls(testCall)

    // If no steps, consider as empty
    if (stepCalls.length === 0) continue

    // Check each step
    for (const stepCall of stepCalls) {
      const arrowFunction = stepCall.getArguments()[1]
      if (!arrowFunction || !Node.isArrowFunction(arrowFunction)) continue

      const body = arrowFunction.getBody()
      if (!body) continue

      // Get block statements
      const block = Node.isBlock(body) ? body : null
      if (!block) {
        // No block = inline expression (not empty)
        return false
      }

      const statements = block.getStatements()

      // Check if all statements are comments or empty
      for (const stmt of statements) {
        // Skip empty statements
        if (stmt.getKind() === SyntaxKind.EmptyStatement) continue

        // Check if it's just a comment
        const text = stmt.getText().trim()

        // Allow only comments: /* ... */ or // ...
        const isComment = text.startsWith('/*') || text.startsWith('//') || text.length === 0

        if (!isComment) {
          // Found real code - not an empty test
          return false
        }
      }
    }
  }

  return true
}
