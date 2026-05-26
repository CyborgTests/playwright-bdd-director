import { CallExpression, Project, SourceFile, SyntaxKind } from 'ts-morph'

import { AST_IDENTIFIERS } from '@/framework/constants/test-files'

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
 * Find all test() calls within describe block
 * Supports: test(), test.only(), test.skip(), test.fixme(), authTest(), customTest(), and any fixture
 * Excludes: test.beforeEach, test.afterEach, test.beforeAll, test.afterAll, *.describe
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

    // Match: test, test.only, test.skip, test.fixme, authTest, customTest, and any fixture
    // Exclude: test.beforeEach, test.afterEach, test.beforeAll, test.afterAll, *.describe
    const isTestCall =
      !expression.includes('.') ||
      (expression.includes('.') &&
        !expression.startsWith('test.before') &&
        !expression.startsWith('test.after') &&
        !expression.endsWith('.describe'))

    if (isTestCall) {
      testCalls.push(callExpression)
    }
  }

  return testCalls
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

  // Template expression with substitutions: `text ${var}`
  if (arg.isKind(SyntaxKind.TemplateExpression)) {
    // For validation, we need the raw text (will be normalized in comparison)
    return arg.getText().slice(1, -1) // Remove backticks
  }

  // Fallback: return text as-is
  return arg.getText().replace(/^['"`]|['"`]$/g, '')
}
