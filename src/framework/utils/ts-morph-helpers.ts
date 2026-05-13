import { CallExpression, Project, SourceFile, SyntaxKind } from 'ts-morph'

import { AST_IDENTIFIERS } from '@/framework/constants/paths'

// Regex constants (compiled once, reused many times)
const TEST_CALL_PATTERN = /^test(\.(only|skip|fixme))?$/

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
 * Find test.describe() call in source file
 */
export function findDescribeCall(sourceFile: SourceFile): CallExpression | undefined {
  return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).find((call) => {
    const expression = call.getExpression().getText()
    return expression === AST_IDENTIFIERS.TEST_DESCRIBE
  })
}

/**
 * Find all test() calls within describe block
 * Supports: test(), test.only(), test.skip(), test.fixme()
 * Excludes: test.beforeEach, test.afterEach, test.beforeAll, test.afterAll
 */
export function findTestCalls(describeCall: CallExpression): CallExpression[] {
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

  if (!body) return []

  // Get only direct statement-level call expressions (not nested in other calls)
  const statements = body.asKind(SyntaxKind.Block)?.getStatements() ?? []

  const testCalls: CallExpression[] = []

  for (const statement of statements) {
    // Only expression statements that are direct test() calls
    const expressionStatement = statement.asKind(SyntaxKind.ExpressionStatement)
    if (!expressionStatement) continue

    const callExpression = expressionStatement.getExpression().asKind(SyntaxKind.CallExpression)
    if (!callExpression) continue

    const expression = callExpression.getExpression().getText()

    // Match: test, test.only, test.skip, test.fixme
    // Exclude: test.beforeEach, test.afterEach, test.beforeAll, test.afterAll, test.describe
    const isTestCall = TEST_CALL_PATTERN.test(expression)

    if (isTestCall) {
      testCalls.push(callExpression)
    }
  }

  return testCalls
}

/**
 * Find all step calls within test block
 * Supports: manualStep(), test.step()
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
      return expression === AST_IDENTIFIERS.MANUAL_STEP || expression === AST_IDENTIFIERS.TEST_STEP
    }) ?? []
  )
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

  // Template expression with substitutions: `text ${var}`
  if (arg.isKind(SyntaxKind.TemplateExpression)) {
    // For validation, we need the raw text (will be normalized in comparison)
    return arg.getText().slice(1, -1) // Remove backticks
  }

  // Fallback: return text as-is
  return arg.getText().replace(/^['"`]|['"`]$/g, '')
}
