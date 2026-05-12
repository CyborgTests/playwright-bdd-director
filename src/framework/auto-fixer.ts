import { CallExpression } from 'ts-morph'

import { getIcon } from './icons'
import { ParsedMD } from './md-parser'
import {
  findDescribeCall,
  findStepCalls,
  findTestCalls,
  getSharedProject,
  getStringLiteralValue
} from './ts-morph-helpers'

export interface AutoFixResult {
  filePath: string
  fixed: boolean
  changes: string[]
}

/**
 * Auto-fix test file to match MD specification
 * Uses ts-morph for safe AST-based code modification
 */
export function autoFixTestFile(testFilePath: string, mdData: ParsedMD): AutoFixResult {
  const changes: string[] = []
  const project = getSharedProject()
  const sourceFile = project.addSourceFileAtPath(testFilePath)

  // 1. Fix suite ttl
  const describeCall = findDescribeCall(sourceFile)
  if (describeCall) {
    const fixedSuite = fixSuiteTtl(describeCall, mdData, changes)

    // 2. Fix test cases
    if (fixedSuite) {
      fixTestCases(describeCall, mdData, changes)
    }
  }

  // 3. Save changes if any were made
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
  const expectedTtl = mdData.suiteID ? `[${mdData.suiteID}] ${mdData.suiteTtl}` : mdData.suiteTtl

  if (currentTtl !== expectedTtl) {
    const ttlArg = describeCall.getArguments()[0]
    if (ttlArg) {
      ttlArg.replaceWithText(`'${escapeString(expectedTtl)}'`)
      changes.push(`Test suite title: "${currentTtl}" → "${expectedTtl}"`)
      return true
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
    const expectedTtl = mdTestCase.id !== null ? `[${mdTestCase.id}] ${mdTestCase.ttl}` : mdTestCase.ttl

    if (currentTtl && !ttlsMatch(currentTtl, expectedTtl)) {
      const ttlArg = testCall.getArguments()[0]
      if (ttlArg) {
        ttlArg.replaceWithText(`'${escapeString(expectedTtl)}'`)
        changes.push(`Test case #${i + 1} title: "${currentTtl}" → "${expectedTtl}"`)
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
      // Missing step - skip (don't auto-generate)
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
 * Check if ttls match (considering ID suffixes like -AUTO, -MANUAL)
 */
function ttlsMatch(current: string, expected: string): boolean {
  if (current === expected) return true

  // Extract IDs and compare
  const currentMatch = current.match(/^\[([^\]]+)\]\s*(.*)$/)
  const expectedMatch = expected.match(/^\[([^\]]+)\]\s*(.*)$/)

  if (currentMatch && expectedMatch) {
    const currentId = currentMatch[1]
    const expectedId = expectedMatch[1]
    const currentTtl = currentMatch[2]
    const expectedTtl = expectedMatch[2]

    // Allow suffix in current ID (TC01-01-AUTO matches TC01-01)
    const idsMatch = currentId === expectedId || currentId.startsWith(expectedId + '-')
    const ttlsMatch = currentTtl === expectedTtl

    return idsMatch && ttlsMatch
  }

  return false
}

/**
 * Escape string for safe insertion into code
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}
