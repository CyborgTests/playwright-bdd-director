import { CallExpression, SyntaxKind } from 'ts-morph'

import { PATTERNS } from '../constants/paths'
import { parseIDAndTitle } from '../utils/helpers'
import {
  findDescribeCall,
  findStepCalls,
  findTestCalls,
  getSharedProject,
  getStringLiteralValue
} from '../utils/ts-morph-helpers'

export interface ParsedTestCase {
  id: string | null // TC-001, "" for empty brackets [], or null for no brackets
  ttl: string // User login with valid credentials
  stepTtls: string[]
  stepCallKinds: StepCallKind[]
}

export type StepCallKind = 'manualStep' | 'test.step'

export interface ParsedTest {
  suiteID: string | null // "" for [], "TS01" for [TS01], or null for no brackets
  suiteTtl: string
  testCases: ParsedTestCase[]
  tags: string[]
}

/**
 * Parse TypeScript test file and extract test suite with test cases
 * Using ts-morph for AST-based parsing (more reliable than RegEx)
 */
export function parseTestFile(filePath: string): ParsedTest {
  const project = getSharedProject()
  const sourceFile = project.addSourceFileAtPath(filePath)

  // 1. Find test.describe() call
  const describeCall = findDescribeCall(sourceFile)
  if (!describeCall) {
    throw new Error(`No test.describe() found in ${filePath}`)
  }

  // 2. Extract suite ID and ttl
  const suiteText = getStringLiteralValue(describeCall, 0)
  if (!suiteText) {
    throw new Error(`Cannot extract suite ttl from test.describe() in ${filePath}`)
  }

  const { id: suiteID, ttl: suiteTtl } = parseIDAndTitle(suiteText)

  // 2.5. Extract tags from test.describe()
  const tags = extractTagsFromDescribe(describeCall)

  // 3. Find all test() calls within describe
  const testCalls = findTestCalls(describeCall)
  const testCases: ParsedTestCase[] = []

  for (const testCall of testCalls) {
    const testText = getStringLiteralValue(testCall, 0)
    if (!testText) continue

    const { id: testCaseID, ttl: testCaseTtl } = parseIDAndTitle(testText)

    // 4. Find step calls within test
    const stepCalls = findStepCalls(testCall)
    const stepTtls: string[] = []
    const stepCallKinds: StepCallKind[] = []

    for (const stepCall of stepCalls) {
      const stepText = getStringLiteralValue(stepCall, 0)
      if (stepText) {
        stepTtls.push(stepText)
        stepCallKinds.push(inferStepCallKind(stepCall))
      }
    }

    testCases.push({
      id: testCaseID,
      ttl: testCaseTtl,
      stepTtls,
      stepCallKinds
    })
  }

  if (testCases.length === 0) {
    throw new Error(`No test cases found in ${filePath}`)
  }

  // 5. Validate no duplicate IDs
  validateNoDuplicateIDs(testCases, filePath)

  return { suiteID, suiteTtl, testCases, tags }
}

/**
 * Infer step call kind from call expression
 */
function inferStepCallKind(call: CallExpression): StepCallKind {
  const expression = call.getExpression().getText()

  if (expression === 'manualStep') return 'manualStep'
  return 'test.step'
}

/**
 * Extract tags from test.describe() call
 * Example: test.describe('title', { tag: [TAG.TEST.MANUAL, TAG.SUITE.TODO] }, () => {})
 */
function extractTagsFromDescribe(describeCall: CallExpression): string[] {
  const args = describeCall.getArguments()

  // If 3 args, middle one is options object with tags
  if (args.length === 3) {
    const optionsArg = args[1]
    if (!optionsArg) return []

    // Find 'tag' property in options object
    const objectLiteral = optionsArg.asKind(SyntaxKind.ObjectLiteralExpression)
    if (!objectLiteral) return []

    const tagProperty = objectLiteral.getProperty('tag')
    if (!tagProperty) return []

    // Get array elements
    const initializer = tagProperty.asKind(SyntaxKind.PropertyAssignment)?.getInitializer()
    const arrayLiteral = initializer?.asKind(SyntaxKind.ArrayLiteralExpression)
    if (!arrayLiteral) return []

    return arrayLiteral.getElements().map((el) => el.getText())
  }

  return []
}

/**
 * Validate no duplicate test case IDs
 * Suffix-only IDs (MANUAL, AUTO, HYBRID) are excluded from duplicate check
 */
function validateNoDuplicateIDs(testCases: ParsedTestCase[], filePath: string): void {
  const idsWithBrackets = testCases
    .filter((tc) => tc.id !== null && tc.id !== '')
    .map((tc) => tc.id as string)
    // Exclude suffix-only IDs (all caps, no dashes/numbers) - these come from empty MD IDs []
    .filter((id) => !PATTERNS.SUFFIX_ONLY.test(id))
  const duplicateIDs = idsWithBrackets.filter((id, index) => idsWithBrackets.indexOf(id) !== index)

  if (duplicateIDs.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateIDs)]
    throw new Error(
      `Duplicate test case IDs found in ${filePath}:\n` +
        uniqueDuplicates.map((id) => `  - [${id}]`).join('\n') +
        `\n\nEach test() must have a unique ID within the suite.`
    )
  }
}
