import path from 'path'
import { Block, CallExpression, Node, Statement, SyntaxKind } from 'ts-morph'

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
import { buildTestCaseTtl } from './test-generator'
import { alignByTitle, type AlignOp } from './title-aligner'

export interface AutoFixResult {
  filePath: string
  fixed: boolean
  changes: string[]
}

type FileType = 'AUTO' | 'CYBORG'

/**
 * Cyborg file whose steps are test.step() blocks - its steps are structured by hand and not
 * validated by dress (see file-matcher), so only test cases are aligned, never steps
 */
function hasTestStepCalls(describeCall: CallExpression): boolean {
  return findTestCalls(describeCall).some((testCall) =>
    findStepCalls(testCall).some((step) => step.getExpression().getText().endsWith('.step'))
  )
}

/**
 * Auto-fix test file to match MD specification
 * Uses ts-morph for safe AST-based code modification. Test cases and steps are aligned by
 * title/ID (see title-aligner), so MD insertions never shift titles onto other tests' code.
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

  const fileType: FileType = path.basename(testFilePath).toLowerCase().includes('.cyborg.')
    ? 'CYBORG'
    : 'AUTO'
  const stepStyle: StepStyle =
    fileType === 'CYBORG' && hasTestStepCalls(describeCall) ? 'cyborg-test-step' : 'default'

  // 2. Fix suite ttl
  fixSuiteTtl(describeCall, mdData, changes)

  // 3. Fix test cases (and their steps, unless steps are hand-structured)
  fixTestCases(describeCall, mdData, { fileType, stepStyle }, changes)

  // 4. Save changes if any were made
  if (changes.length > 0) {
    sourceFile.formatText() // Auto-format with Prettier-like formatting
    sourceFile.saveSync()
    return { filePath: testFilePath, fixed: true, changes }
  }

  return { filePath: testFilePath, fixed: false, changes: [] }
}

/**
 * Titles match exactly or by ID with implementation suffix (`[tc01-AUTO] X` ↔ `[tc01] X`)
 */
function isTitleMatch(currentTtl: string, expectedTtl: string): boolean {
  if (currentTtl === expectedTtl) return true

  const currentParsed = parseIDAndTitle(currentTtl)
  const expectedParsed = parseIDAndTitle(expectedTtl)
  if (currentParsed.id === null || expectedParsed.id === null) return false

  return (
    matchIDWithSuffix(expectedParsed.id, currentParsed.id) &&
    currentParsed.ttl === expectedParsed.ttl
  )
}

/**
 * Same test case: matching title, or same non-empty MD ID (ID is stable when title changes)
 */
function isSameTestCase(currentTtl: string, expectedTtl: string): boolean {
  if (isTitleMatch(currentTtl, expectedTtl)) return true

  const currentId = parseIDAndTitle(currentTtl).id
  const expectedId = parseIDAndTitle(expectedTtl).id
  return !!currentId && !!expectedId && matchIDWithSuffix(expectedId, currentId)
}

/**
 * Fix test.describe() suite ttl to match MD
 */
function fixSuiteTtl(describeCall: CallExpression, mdData: ParsedMD, changes: string[]): boolean {
  const currentTtl = getStringLiteralValue(describeCall, 0)
  const expectedTtl =
    mdData.suiteID !== null ? `[${mdData.suiteID}] ${mdData.suiteTtl}` : mdData.suiteTtl

  if (currentTtl && !isTitleMatch(currentTtl, expectedTtl)) {
    const ttlArg = describeCall.getArguments()[0]
    if (ttlArg) {
      const newTtl = preserveSuffix(currentTtl, expectedTtl)
      ttlArg.replaceWithText(`'${escapeString(newTtl)}'`)
      changes.push(`Test suite title: "${currentTtl}" → "${newTtl}"`)
      return true
    }
  }

  return false
}

type StepStyle = 'default' | 'cyborg-test-step'

interface FixOptions {
  fileType: FileType
  stepStyle: StepStyle
}

/**
 * Fix test cases to match MD specification: rename paired cases, insert missing ones as
 * skeletons next to their MD neighbours, report extra and reordered ones (code is never deleted)
 */
function fixTestCases(
  describeCall: CallExpression,
  mdData: ParsedMD,
  options: FixOptions,
  changes: string[]
): void {
  const testCalls = findTestCalls(describeCall)
  const describeBody = getCallbackBlock(describeCall)
  const currentTtls = testCalls.map((call) => getStringLiteralValue(call, 0) ?? '')
  const expectedTtls = mdData.testCases.map((tc) =>
    tc.id !== null ? `[${tc.id}] ${tc.ttl}` : tc.ttl
  )
  const inserter = createInserter(
    describeBody,
    testCalls.map((call) => (describeBody ? getStatementIn(call, describeBody) : undefined)),
    true
  )

  const ops = alignByTitle(currentTtls, expectedTtls, isSameTestCase)
  const newTtl = createSiblingTtlBuilder(ops, currentTtls, expectedTtls, options.fileType)

  for (const op of ops) {
    if (op.kind === 'extra') {
      changes.push(
        `${getIcon('warning')}  Extra test case "${currentTtls[op.current]}" (not in MD) - manual review needed`
      )
      continue
    }

    const mdTestCase = mdData.testCases[op.expected]
    if (op.kind === 'moved') {
      changes.push(
        `${getIcon('warning')}  Test case "${mdTestCase.ttl}" order differs from MD - reorder manually`
      )
      continue
    }

    if (op.kind === 'insert') {
      const ttl = newTtl(mdTestCase.id, mdTestCase.ttl)
      if (inserter.insert(op.after, buildTestCaseCode(ttl, mdTestCase.stepTtls, options))) {
        changes.push(`Test case #${op.expected + 1}: Added "${ttl}" (skeleton)`)
      } else {
        changes.push(
          `${getIcon('warning')}  Missing test case #${op.expected + 1}: "${mdTestCase.ttl}" - manual addition needed`
        )
      }
      continue
    }

    // Pair: fix title (keeping implementation suffix), then steps
    const testCall = testCalls[op.current]
    const currentTtl = currentTtls[op.current]
    const expectedTtl = expectedTtls[op.expected]
    if (currentTtl && !isTitleMatch(currentTtl, expectedTtl)) {
      const newTtl = preserveSuffix(currentTtl, expectedTtl)
      testCall.getArguments()[0]?.replaceWithText(`'${escapeString(newTtl)}'`)
      changes.push(`Test case #${op.expected + 1} title: "${currentTtl}" → "${newTtl}"`)
    }

    if (options.stepStyle === 'default') {
      fixTestSteps(testCall, mdTestCase.stepTtls, options.fileType, changes, op.expected + 1)
    }
  }
}

/**
 * Title builder for inserted test cases that copies the implementation suffix of existing tests
 * in the file (`[tc01-API]` ↔ MD `[tc01]` → suffix `-API`; `[CYBORG]` ↔ MD `[]` → `CYBORG`).
 * Without a paired sibling falls back to the generator convention for the file type.
 */
function createSiblingTtlBuilder(
  ops: AlignOp[],
  currentTtls: string[],
  expectedTtls: string[],
  fileType: FileType
): (_id: string | null, _ttl: string) => string {
  for (const op of ops) {
    if (op.kind !== 'pair') continue
    const currentId = parseIDAndTitle(currentTtls[op.current]).id
    const expectedId = parseIDAndTitle(expectedTtls[op.expected]).id
    if (currentId === null || expectedId === null) continue
    if (!matchIDWithSuffix(expectedId, currentId)) continue

    const emptyIdSuffix = expectedId === '' ? currentId : null
    const dashSuffix = expectedId !== '' ? currentId.slice(expectedId.length) : null
    return (id, ttl) => {
      if (id === null) return ttl
      if (id === '') return emptyIdSuffix !== null ? `[${emptyIdSuffix}] ${ttl}` : `[] ${ttl}`
      return `[${id}${dashSuffix ?? ''}] ${ttl}`
    }
  }
  return (id, ttl) => buildTestCaseTtl(id, ttl, fileType)
}

/**
 * Fix test steps to match MD specification - aligned by title like test cases
 */
function fixTestSteps(
  testCall: CallExpression,
  expectedSteps: string[],
  fileType: FileType,
  changes: string[],
  testCaseIndex: number
): void {
  const stepCalls = findStepCalls(testCall)
  const currentSteps = stepCalls.map((call) => getStringLiteralValue(call, 0) ?? '')
  const inserter = createInserter(
    getCallbackBlock(testCall),
    stepCalls.map((call) => getStatementIn(call))
  )
  const neighbourIsTestStep = stepCalls[0]?.getExpression().getText().endsWith('.step')
  const useTestStep = neighbourIsTestStep ?? fileType === 'AUTO'

  for (const op of alignByTitle(currentSteps, expectedSteps, (a, b) => a === b)) {
    if (op.kind === 'extra') {
      changes.push(
        `  ${getIcon('warning')}  TC#${testCaseIndex} extra step "${currentSteps[op.current]}" - manual review needed`
      )
      continue
    }

    const expectedStep = expectedSteps[op.expected]
    if (op.kind === 'moved') {
      changes.push(
        `  ${getIcon('warning')}  TC#${testCaseIndex} step "${expectedStep}" order differs from MD - reorder manually`
      )
      continue
    }

    if (op.kind === 'insert') {
      const code = useTestStep ? buildTestStepCode(expectedStep) : buildManualStepCode(expectedStep)
      const added = inserter.insert(op.after, code)
      changes.push(
        added
          ? `  TC#${testCaseIndex} Step#${op.expected + 1}: Added "${expectedStep}" (placeholder)`
          : `  ${getIcon('warning')}  TC#${testCaseIndex} Step#${op.expected + 1} missing: "${expectedStep}"`
      )
      continue
    }

    const currentStep = currentSteps[op.current]
    if (currentStep && currentStep !== expectedStep) {
      stepCalls[op.current].getArguments()[0]?.replaceWithText(`'${escapeString(expectedStep)}'`)
      changes.push(
        `  TC#${testCaseIndex} Step#${op.expected + 1}: "${currentStep}" → "${expectedStep}"`
      )
    }
  }
}

function buildTestCaseCode(ttl: string, steps: string[], options: FixOptions): string {
  const isCyborg = options.fileType === 'CYBORG'
  const stepCode = steps.map((step) =>
    !isCyborg
      ? buildTestStepCode(step)
      : options.stepStyle === 'cyborg-test-step'
        ? `await test.step('${escapeString(step)}', async () => {\n${buildManualStepCode(step)}\n})`
        : buildManualStepCode(step)
  )
  const params = isCyborg ? '{ manualStep }' : ''
  return `test('${escapeString(ttl)}', async (${params}) => {\n${stepCode.join('\n')}\n})`
}

function buildTestStepCode(step: string): string {
  return `await test.step('${escapeString(step)}', async () => {\n// TODO: Implement step\n})`
}

function buildManualStepCode(step: string): string {
  return `await manualStep('${escapeString(step)}')`
}

/**
 * Body block of the callback passed as last argument (describe / test)
 */
function getCallbackBlock(call: CallExpression): Block | undefined {
  const args = call.getArguments()
  const callback = args[args.length - 1]
  const fn =
    callback?.asKind(SyntaxKind.ArrowFunction) ?? callback?.asKind(SyntaxKind.FunctionExpression)
  return fn?.getBody()?.asKind(SyntaxKind.Block)
}

/**
 * Statement containing `call` that sits directly in `block` (or in its nearest block when omitted)
 */
function getStatementIn(call: CallExpression, block?: Block): Statement | undefined {
  return call.getFirstAncestor(
    (node): node is Statement =>
      Node.isStatement(node) &&
      (block ? node.getParent() === block : Node.isBlock(node.getParent()))
  )
}

/**
 * Inserts code after anchor statements, keeping consecutive inserts after the same anchor in
 * order. Anchor `null` = before the first anchor statement (or at the end of `fallbackBlock`).
 * `separate` surrounds inserted code with blank lines (test cases), steps are inserted as is.
 */
function createInserter(
  fallbackBlock: Block | undefined,
  anchorStatements: Array<Statement | undefined>,
  separate = false
): { insert: (_after: number | null, _code: string) => boolean } {
  const lastInserted = new Map<number | null, Statement>()

  return {
    insert(after, code) {
      const previous = lastInserted.get(after)
      const anchor = after === null ? undefined : anchorStatements[after]
      const firstAnchor = anchorStatements.find(Boolean)

      let block: Block | undefined
      let index: number
      if (previous) {
        block = previous.getParentIfKind(SyntaxKind.Block)
        index = (block?.getStatements().indexOf(previous) ?? -1) + 1
      } else if (anchor) {
        block = anchor.getParentIfKind(SyntaxKind.Block)
        index = (block?.getStatements().indexOf(anchor) ?? -1) + 1
      } else if (after === null && firstAnchor) {
        block = firstAnchor.getParentIfKind(SyntaxKind.Block)
        index = block?.getStatements().indexOf(firstAnchor) ?? -1
      } else {
        block = fallbackBlock
        index = block?.getStatements().length ?? -1
      }

      if (!block || index < 0) return false
      const [inserted] = block.insertStatements(index, (writer) => {
        if (separate) writer.blankLine()
        writer.write(code)
        if (separate) writer.blankLine()
      })
      if (inserted) lastInserted.set(after, inserted)
      return !!inserted
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

  for (const testCall of testCalls) {
    const stepCalls = findStepCalls(testCall)

    // No steps: the test body itself must be empty, otherwise it holds real implementation
    if (stepCalls.length === 0) {
      const testArgs = testCall.getArguments()
      if (hasRealCode(testArgs[testArgs.length - 1])) return false
      continue
    }

    for (const stepCall of stepCalls) {
      if (hasRealCode(stepCall.getArguments()[1])) return false
    }
  }

  return true
}

/**
 * True when function body contains anything but comments / empty statements.
 * Inline arrow expression (no block) counts as real code.
 */
function hasRealCode(fn: Node | undefined): boolean {
  if (!fn || (!Node.isArrowFunction(fn) && !Node.isFunctionExpression(fn))) return false

  const body = fn.getBody()
  if (!body) return false
  if (!Node.isBlock(body)) return true

  return body.getStatements().some((stmt) => {
    if (stmt.getKind() === SyntaxKind.EmptyStatement) return false
    const text = stmt.getText().trim()
    return !(text.startsWith('/*') || text.startsWith('//') || text.length === 0)
  })
}
