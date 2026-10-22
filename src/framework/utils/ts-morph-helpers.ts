import {
  ArrayLiteralExpression,
  CallExpression,
  Node,
  Project,
  SourceFile,
  Statement,
  SyntaxKind
} from 'ts-morph'

import { AST_IDENTIFIERS } from '@/framework/constants/test-files'

import type { ExamplesTable } from '../core/md-parser'
import { isBackgroundTitle, parseIDAndTitle } from './helpers'

// Singleton Project instance for performance
let _sharedProject: Project | null = null

export function getSharedProject(): Project {
  if (!_sharedProject) {
    _sharedProject = new Project()
  }
  return _sharedProject
}

/**
 * Reset shared Project instance to free memory
 * Call this after processing all files to prevent memory leaks
 */
export function resetSharedProject(): void {
  _sharedProject = null
}

/**
 * Find *.describe() call in source file
 * Supports: test.describe(), test.describe.skip(), authTest.describe(), customTest.describe(), and any fixture with .describe()
 */
export function findDescribeCall(sourceFile: SourceFile): CallExpression | undefined {
  return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).find((call) => {
    const expression = call.getExpression().getText()
    return expression.includes('.describe')
  })
}

/**
 * *.describe(), *.describe.serial/parallel/skip/fixme/only() - but not *.describe.configure()
 */
const DESCRIBE_EXPRESSION = /\.describe(\.(serial|parallel|skip|fixme|only))?$/

/**
 * True for describe calls, including an alias whose every initializer branch is a describe
 * expression, e.g. `const describeFn = isSmoke ? test.describe.skip : test.describe`
 */
export function isDescribeCall(callExpression: CallExpression): boolean {
  const expression = callExpression.getExpression()
  if (DESCRIBE_EXPRESSION.test(expression.getText())) return true

  if (!Node.isIdentifier(expression)) return false
  const initializer = expression
    .getSourceFile()
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((declaration) => declaration.getName() === expression.getText())
    ?.getInitializer()
  if (!initializer) return false
  const branches = Node.isConditionalExpression(initializer)
    ? [initializer.getWhenTrue(), initializer.getWhenFalse()]
    : [initializer]
  return branches.every((branch) => DESCRIBE_EXPRESSION.test(branch.getText()))
}

/**
 * Outermost describe calls of file (no enclosing describe), in source order. One MD suite may be
 * split into several describes, or wrapped in an exported function - validator reads them all.
 */
export function findOutermostDescribeCalls(sourceFile: SourceFile): CallExpression[] {
  return sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(
      (call) =>
        isDescribeCall(call) &&
        !call
          .getAncestors()
          .some((node) => node.isKind(SyntaxKind.CallExpression) && isDescribeCall(node))
    )
}

/**
 * Find all test() calls within describe block, in source order
 * Supports: test(), test.only(), test.skip(), test.fixme(), authTest(), customTest(), any fixture,
 * named test.beforeAll/afterAll('title', fn), test.beforeEach('Background', fn) (see isNamedHook)
 * and tests declared in a loop
 * Excludes: other beforeEach/afterEach, unnamed beforeAll/afterAll, test.use, runtime modifiers
 * (test.skip(condition, reason), test.slow(), test.setTimeout()), nested describes
 */
export function findTestCalls(describeCall: CallExpression): CallExpression[] {
  return getDescribeBodyCalls(describeCall).filter(isTestCaseCall)
}

/**
 * Same as findTestCalls, but also descends into nested describes (grouping only - their titles
 * are not MD entities), keeping source order
 */
export function findTestCallsDeep(describeCall: CallExpression): CallExpression[] {
  return getDescribeBodyCalls(describeCall).flatMap((call) =>
    isDescribeCall(call) ? findTestCallsDeep(call) : isTestCaseCall(call) ? [call] : []
  )
}

/**
 * Statement-level call expressions of describe callback body (not nested in other calls)
 */
function getDescribeBodyCalls(describeCall: CallExpression): CallExpression[] {
  const args = describeCall.getArguments()

  // Support both:
  // test.describe('title', () => {}) - callback at index 1
  // test.describe('title', { tag: [...] }, () => {}) - callback at index 2
  const callback = args.length === 3 ? args[2] : args[1]
  if (!callback) return []

  // Get the function body (arrow function or regular function)
  const body =
    callback.asKind(SyntaxKind.ArrowFunction)?.getBody() ??
    callback.asKind(SyntaxKind.FunctionExpression)?.getBody()

  const statements = body?.asKind(SyntaxKind.Block)?.getStatements() ?? []
  return statements.flatMap(getStatementCalls)
}

/**
 * Call of a describe-body statement. A loop at describe level (`for (const x of xs) test(...)`,
 * `xs.forEach((x) => { test(...) })`) declares one parametrized Test Case - its body statements
 * are read as if written inline.
 */
function getStatementCalls(statement: Node): CallExpression[] {
  const loop =
    statement.asKind(SyntaxKind.ForOfStatement) ??
    statement.asKind(SyntaxKind.ForInStatement) ??
    statement.asKind(SyntaxKind.ForStatement)
  if (loop) {
    const loopBody = loop.getStatement()
    const loopStatements = loopBody.asKind(SyntaxKind.Block)?.getStatements() ?? [loopBody]
    return loopStatements.flatMap(getStatementCalls)
  }

  const callExpression = statement
    .asKind(SyntaxKind.ExpressionStatement)
    ?.getExpression()
    .asKind(SyntaxKind.CallExpression)
  if (!callExpression) return []

  if (callExpression.getExpression().getText().endsWith('.forEach')) {
    const callback = callExpression.getArguments()[0]
    const callbackBody =
      callback?.asKind(SyntaxKind.ArrowFunction)?.getBody() ??
      callback?.asKind(SyntaxKind.FunctionExpression)?.getBody()
    const callbackStatements = callbackBody?.asKind(SyntaxKind.Block)?.getStatements() ?? []
    return callbackStatements.flatMap(getStatementCalls)
  }

  return [callExpression]
}

function isTestCaseCall(callExpression: CallExpression): boolean {
  if (isNamedHook(callExpression)) return true
  if (isDescribeCall(callExpression)) return false

  const expression = callExpression.getExpression().getText()
  const isHookOrConfig =
    expression.startsWith('test.before') ||
    expression.startsWith('test.after') ||
    expression.startsWith('test.use')
  return !isHookOrConfig && hasTestBody(callExpression)
}

/**
 * Named `test.beforeAll('title', fn)` / `test.afterAll('title', fn)` counts as MD Test Case: an
 * automated suite can keep API setup/teardown in a hook (runs for any --grep subset) while its
 * test.step titles still map 1:1 to MD steps. Unnamed hooks stay plain setup/teardown.
 * `test.beforeEach('Background', fn)` is the Background Test Case (see isBackgroundTitle); other
 * beforeEach/afterEach hooks are never Test Cases.
 */
function isNamedHook(callExpression: CallExpression): boolean {
  const expression = callExpression.getExpression().getText()
  const isAllHook = expression.endsWith('.beforeAll') || expression.endsWith('.afterAll')
  if (!isAllHook && !expression.endsWith('.beforeEach')) return false

  const firstArg = callExpression.getArguments()[0]
  const title =
    firstArg?.asKind(SyntaxKind.StringLiteral)?.getLiteralValue() ??
    firstArg?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralValue()
  if (title === undefined) return false
  return isAllHook || isBackgroundTitle(parseIDAndTitle(title).ttl)
}

/**
 * Hook declared as test case (named beforeAll/afterAll, Background beforeEach). Playwright hooks
 * take no details, so they carry no tags - a hook runs whenever any test of its describe runs.
 */
export function isHookCall(call: CallExpression): boolean {
  return /\.(before|after)(All|Each)$/.test(call.getExpression().getText())
}

/**
 * Test declaration = (title, [details,] body). Runtime modifiers such as conditional
 * `test.skip(condition, reason)`, `test.skip(({ browserName }) => ..., reason)`, `test.slow()` or
 * `test.setTimeout(ms)` have no body after a non-function first argument, so they are not Test Cases
 */
function hasTestBody(callExpression: CallExpression): boolean {
  const args = callExpression.getArguments()
  const isFunction = (node: Node | undefined): boolean =>
    !!node && (node.isKind(SyntaxKind.ArrowFunction) || node.isKind(SyntaxKind.FunctionExpression))
  return args.length >= 2 && !isFunction(args[0]) && isFunction(args[args.length - 1])
}

/**
 * Find all step calls within test block
 * Supports: manualStep(), test.step(), authTest.step(), customTest.step(), and any fixture with .step
 * Excludes: manualStep() calls that are inside test.step() - they are part of the step, not separate steps
 */
export function findStepCalls(testCall: CallExpression): CallExpression[] {
  const args = testCall.getArguments()

  // Support both:
  // test('title', async () => {}) - callback at index 1
  // test('title', { tag: [...] }, async () => {}) - callback at index 2
  const callback = args.length === 3 ? args[2] : args[1]
  if (!callback) return []

  return (
    callback.getDescendantsOfKind(SyntaxKind.CallExpression).filter((call) => {
      const expression = call.getExpression().getText()

      // Always include test.step calls
      if (expression.endsWith('.step')) return true

      // For manualStep, check if it's inside a test.step - if so, exclude it
      if (expression === AST_IDENTIFIERS.MANUAL_STEP) {
        return !isInsideTestStep(call)
      }

      return false
    }) ?? []
  )
}

/**
 * Check if a call expression is inside a test.step() call
 */
function isInsideTestStep(call: CallExpression): boolean {
  let parent = call.getParent()

  while (parent) {
    // Check if parent is a CallExpression with .step
    const parentCall = parent.asKind(SyntaxKind.CallExpression)
    if (parentCall) {
      const parentExpression = parentCall.getExpression().getText()
      if (parentExpression.endsWith('.step')) {
        return true
      }
    }
    parent = parent.getParent()
  }

  return false
}

/**
 * Extract string literal value from call expression argument
 * Handles: string literals, template literals, escape sequences
 */
export function getStringLiteralValue(call: CallExpression, index: number): string | undefined {
  const arg = call.getArguments()[index]
  if (!arg) return undefined

  // String literal: 'text', "text"
  if (arg.isKind(SyntaxKind.StringLiteral)) {
    return arg.getLiteralText()
  }

  // Template literal: `text`
  if (arg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
    return arg.getLiteralText()
  }

  // Template expression with substitutions: `text ${var}` - examples columns read as `<column>`
  if (arg.isKind(SyntaxKind.TemplateExpression)) {
    const loopVar = findExamplesLoop(call)?.varName
    const spans = arg.getTemplateSpans().map((span) => {
      const expression = span.getExpression()
      const column = loopVar ? getExampleColumn(expression, loopVar) : undefined
      const text = column !== undefined ? `<${column}>` : `\${${expression.getText()}}`
      return text + span.getLiteral().getLiteralText()
    })
    return arg.getHead().getLiteralText() + spans.join('')
  }

  // Fallback: return text as-is
  return arg.getText().replace(/^['"`]|['"`]$/g, '')
}

export interface ExamplesLoop {
  varName: string // loop variable: `example`
  array: ArrayLiteralExpression | undefined // inline data, undefined for a variable / call
  statement: Statement // the loop statement itself
}

/**
 * Nearest loop around call: `for (const example of [...]) { ... }` or
 * `[...].forEach((example) => { ... })` - a parametrized test case runs once per element
 */
export function findExamplesLoop(call: Node): ExamplesLoop | undefined {
  for (const node of call.getAncestors()) {
    const forOf = node.asKind(SyntaxKind.ForOfStatement)
    if (forOf) {
      const declaration = forOf
        .getInitializer()
        .asKind(SyntaxKind.VariableDeclarationList)
        ?.getDeclarations()[0]
      const varName = declaration?.getNameNode().asKind(SyntaxKind.Identifier)?.getText()
      if (!varName) return undefined
      const array = forOf.getExpression().asKind(SyntaxKind.ArrayLiteralExpression)
      return { varName, array, statement: forOf }
    }

    const fn = node.asKind(SyntaxKind.ArrowFunction) ?? node.asKind(SyntaxKind.FunctionExpression)
    const forEachCall = fn?.getParent()?.asKind(SyntaxKind.CallExpression)
    const callee = forEachCall?.getExpression().asKind(SyntaxKind.PropertyAccessExpression)
    const statement = forEachCall?.getParentIfKind(SyntaxKind.ExpressionStatement)
    if (fn && callee?.getName() === 'forEach' && statement) {
      const varName = fn.getParameters()[0]?.getNameNode().asKind(SyntaxKind.Identifier)?.getText()
      if (!varName) return undefined
      const array = callee.getExpression().asKind(SyntaxKind.ArrayLiteralExpression)
      return { varName, array, statement }
    }
  }
  return undefined
}

/**
 * Inline examples data: array of objects with string values only, same keys in every object
 * (columns in key order of the first object). Anything else - null.
 */
export function readExamplesArray(array: ArrayLiteralExpression): ExamplesTable | null {
  const records: Array<Map<string, string>> = []
  for (const element of array.getElements()) {
    const object = element.asKind(SyntaxKind.ObjectLiteralExpression)
    if (!object) return null
    const record = new Map<string, string>()
    for (const property of object.getProperties()) {
      const assignment = property.asKind(SyntaxKind.PropertyAssignment)
      const nameNode = assignment?.getNameNode()
      const name =
        nameNode?.asKind(SyntaxKind.Identifier)?.getText() ??
        nameNode?.asKind(SyntaxKind.StringLiteral)?.getLiteralValue()
      const initializer = assignment?.getInitializer()
      const value =
        initializer?.asKind(SyntaxKind.StringLiteral)?.getLiteralValue() ??
        initializer?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralValue()
      if (name === undefined || value === undefined) return null
      record.set(name, value)
    }
    records.push(record)
  }

  const columns = [...(records[0]?.keys() ?? [])]
  const sameKeys = records.every(
    (record) => record.size === columns.length && columns.every((column) => record.has(column))
  )
  if (!sameKeys) return null
  return { columns, rows: records.map((record) => columns.map((column) => record.get(column)!)) }
}

/**
 * Column of `example.column` / `example['column']`
 */
function getExampleColumn(expression: Node, loopVar: string): string | undefined {
  const property = expression.asKind(SyntaxKind.PropertyAccessExpression)
  if (property && property.getExpression().getText() === loopVar) return property.getName()

  const element = expression.asKind(SyntaxKind.ElementAccessExpression)
  if (element && element.getExpression().getText() === loopVar) {
    return element.getArgumentExpression()?.asKind(SyntaxKind.StringLiteral)?.getLiteralValue()
  }
  return undefined
}
