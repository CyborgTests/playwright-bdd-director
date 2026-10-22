import { CallExpression, SyntaxKind } from 'ts-morph'

import { AST_IDENTIFIERS, PATTERNS } from '../constants/test-files'
import { parseIDAndTitle } from '../utils/helpers'
import {
  findExamplesLoop,
  findOutermostDescribeCalls,
  findStepCalls,
  findTestCallsDeep,
  getSharedProject,
  getStringLiteralValue,
  isHookCall,
  readExamplesArray
} from '../utils/ts-morph-helpers'
import type { ExamplesTable } from './md-parser'

export interface ParsedTestCase {
  id: string | null // TC-001, "" for empty brackets [], or null for no brackets
  ttl: string // User login with valid credentials
  stepTtls: string[]
  stepCallKinds: StepCallKind[]
  stepHasManual: boolean[] // manualStep() itself or test.step() wrapping a manualStep()
  modifier: TestModifier | null // test.skip/fixme() or inside describe.skip/fixme()
  hasImplementation: boolean // body calls something besides steps (not an empty skeleton)
  tags: string[] // test('title', { tag: [...] }, fn) - see extractTags
  isHook: boolean // named beforeAll/afterAll or Background beforeEach - has no tags (isHookCall)
  examples: ExamplesTable | null // inline data of loop around test (findExamplesLoop)
}

export type StepCallKind = 'manualStep' | 'test.step'
export type TestModifier = 'skip' | 'fixme'

export interface ParsedTest {
  suiteID: string | null // "" for [], "TS01" for [TS01], or null for no brackets
  suiteTtl: string
  testCases: ParsedTestCase[]
  tags: string[] // tags of first describe - see extractTags
}

/**
 * Parse TypeScript test file and extract test suite with test cases
 * Using ts-morph for AST-based parsing (more reliable than RegEx)
 */
export function parseTestFile(filePath: string): ParsedTest {
  const project = getSharedProject()
  const sourceFile = project.addSourceFileAtPath(filePath)

  /**
   * 1. Find outermost test.describe() calls: one MD suite may span several describes (or be
   * wrapped in an exported function). Suite title and tags come from the first one.
   */
  const describeCalls = findOutermostDescribeCalls(sourceFile)
  const describeCall = describeCalls[0]
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
  const tags = extractTags(describeCall)

  // 3. Find all test() calls within describes, nested describes included
  const testCalls = describeCalls.flatMap(findTestCallsDeep)
  const testCases: ParsedTestCase[] = []

  for (const testCall of testCalls) {
    const testText = getStringLiteralValue(testCall, 0)
    if (!testText) continue

    const { id: testCaseID, ttl: testCaseTtl } = parseIDAndTitle(testText)

    // 4. Find step calls within test
    const stepCalls = findStepCalls(testCall)
    const stepTtls: string[] = []
    const stepCallKinds: StepCallKind[] = []
    const stepHasManual: boolean[] = []

    for (const stepCall of stepCalls) {
      const stepText = getStringLiteralValue(stepCall, 0)
      if (stepText) {
        const kind = inferStepCallKind(stepCall)
        stepTtls.push(stepText)
        stepCallKinds.push(kind)
        stepHasManual.push(kind === 'manualStep' || hasManualStepCall(stepCall))
      }
    }

    testCases.push({
      id: testCaseID,
      ttl: testCaseTtl,
      stepTtls,
      stepCallKinds,
      stepHasManual,
      modifier: inferModifier(testCall),
      hasImplementation: hasImplementationCalls(testCall),
      tags: extractTags(testCall),
      isHook: isHookCall(testCall),
      examples: readTestExamples(testCall)
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

function readTestExamples(testCall: CallExpression): ExamplesTable | null {
  const array = findExamplesLoop(testCall)?.array
  return array ? readExamplesArray(array) : null
}

function hasManualStepCall(call: CallExpression): boolean {
  return call
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .some((inner) => inner.getExpression().getText() === AST_IDENTIFIERS.MANUAL_STEP)
}

/**
 * Static skip/fixme of test case: `test.skip('title', fn)`, `test.fixme('title', fn)` or any
 * enclosing `describe.skip/fixme`. Runtime `test.skip(condition)` inside the body is ignored.
 */
function inferModifier(testCall: CallExpression): TestModifier | null {
  const calls = [
    testCall,
    ...testCall.getAncestors().filter((node) => node.isKind(SyntaxKind.CallExpression))
  ] as CallExpression[]
  for (const call of calls) {
    const expression = call.getExpression().getText()
    if (expression.endsWith('.skip')) return 'skip'
    if (expression.endsWith('.fixme')) return 'fixme'
  }
  return null
}

/**
 * Test body calls anything besides step declarations (page objects, clients, expect) -
 * a generated skeleton holds only steps with empty bodies, a cyborg test only manualStep()
 */
function hasImplementationCalls(testCall: CallExpression): boolean {
  const callback = testCall.getArguments().at(-1)
  if (!callback) return false

  return callback.getDescendantsOfKind(SyntaxKind.CallExpression).some((call) => {
    const expression = call.getExpression().getText()
    return !expression.endsWith('.step') && expression !== AST_IDENTIFIERS.MANUAL_STEP
  })
}

/**
 * Tags from details object of test.describe() / test() call: `{ tag: [TAG.TEST.AUTO, '@smoke'] }`
 * or `{ tag: '@smoke' }`. String literals give their value ("@smoke"), other expressions their
 * source text ("TAG.TEST.AUTO").
 */
function extractTags(call: CallExpression): string[] {
  const args = call.getArguments()
  if (args.length !== 3) return []

  const tagProperty = args[1]?.asKind(SyntaxKind.ObjectLiteralExpression)?.getProperty('tag')
  const initializer = tagProperty?.asKind(SyntaxKind.PropertyAssignment)?.getInitializer()
  if (!initializer) return []

  const elements = initializer.asKind(SyntaxKind.ArrayLiteralExpression)?.getElements() ?? [
    initializer
  ]
  return elements.map(
    (element) =>
      element.asKind(SyntaxKind.StringLiteral)?.getLiteralValue() ??
      element.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralValue() ??
      element.getText()
  )
}

/**
 * Validate no duplicate test case IDs
 * Suffix-only IDs (manual, auto) are excluded from duplicate check
 */
function validateNoDuplicateIDs(testCases: ParsedTestCase[], filePath: string): void {
  const idsWithBrackets = testCases
    .filter((tc) => tc.id !== null && tc.id !== '')
    .map((tc) => tc.id as string)
    // Exclude suffix-only IDs (all lowercase, no dashes/numbers) - these come from empty MD IDs []
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
