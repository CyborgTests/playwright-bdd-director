import path from 'path'
import ts from 'typescript'

import { toPosix } from '../utils/helpers'
import { formatMarkdownSpec } from '../validation/md-validator'
import { quoteString } from './generator'

export interface PlaywrightMigration {
  markdown: string // the spec, formatted as `npm run stage` does
  steps: string // the step file (format it with Prettier)
  tests: number
  stepDefinitions: number
  warnings: string[]
}

export interface MigrationOptions {
  sourcePath: string // the Playwright test file: messages and its relative imports
  suite: string // spec base name - the suite tag of hooks
  stepsDir: string // where the step file goes: relative imports are rewritten for it
  /** Location of an existing step definition the step text matches, undefined for none */
  matchExisting?: (text: string) => string | undefined
}

interface MigratedStep {
  title: string
  fixtures: string[]
  body: string
  line: number
}

interface MigratedTest {
  title: string
  tags: string[]
  steps: string[]
  layer: '@ui' | '@api'
}

const HOOKS: Record<string, string> = {
  beforeEach: 'Before',
  afterEach: 'After',
  beforeAll: 'BeforeAll',
  afterAll: 'AfterAll'
}

/**
 * A Playwright test file as a spec and its step definitions: `test.describe` → `## suite`, each
 * `test` → `### test case` (tags from `{ tag }`, `test.skip` / `test.fixme` → `@skip` / `@fixme`),
 * each `await test.step(title, fn)` → `#### step` and a step definition with the code of `fn` and
 * the fixtures it uses; hooks → hooks of the suite tag; other declarations go along. Only tests
 * made of `test.step` calls: the step titles are the spec - code outside steps has no words.
 * @throws Error listing every line that cannot be moved - nothing is migrated then
 */
export function migratePlaywrightTest(
  source: string,
  { sourcePath, suite, stepsDir, matchExisting = () => undefined }: MigrationOptions
): PlaywrightMigration {
  const file = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true)
  const problems: string[] = []
  const warnings: string[] = []
  const lineOf = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart()).line + 1
  const problem = (node: ts.Node, message: string) =>
    problems.push(`line ${lineOf(node)}: ${message}`)

  const imports = file.statements.filter(ts.isImportDeclaration)
  const testImport = imports.find((declaration) => namedImport(declaration, 'test'))
  const testName = testImport ? namedImport(testImport, 'test')! : 'test'
  const testModule = testImport && (testImport.moduleSpecifier as ts.StringLiteral).text
  if (!testImport) problems.push('no `test` imported - not a Playwright test file')
  if (testModule && testModule !== '@playwright/test') {
    warnings.push(
      `The tests take \`test\` from ${testModule}: step definitions get the fixtures of src/fixtures - merge its fixtures there`
    )
  }

  /** `test.describe.skip` → "describe.skip"; "" for a call of anything else */
  const testCall = (node: ts.Node): string => {
    if (!ts.isCallExpression(node)) return ''
    const callee = node.expression.getText(file)
    if (callee === testName) return 'test'
    return callee.startsWith(`${testName}.`) ? callee.slice(testName.length + 1) : ''
  }

  let suiteTitle = path.basename(sourcePath).replace(/\.(spec|test)\.[cm]?[jt]sx?$/, '')
  const suiteTags: string[] = []
  const tests: MigratedTest[] = []
  const steps = new Map<string, MigratedStep>()
  const hooks: string[] = []
  const declarations: ts.Statement[] = []
  const emitted: ts.Node[] = [] // code going to the step file: its identifiers keep their imports
  let describes = 0

  const visit = (statements: readonly ts.Statement[], inDescribe: boolean) => {
    for (const statement of statements) {
      if (ts.isImportDeclaration(statement)) continue
      const call =
        ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)
          ? statement.expression
          : null
      const kind = call ? testCall(call) : ''
      if (!call || !kind) {
        if (ts.isExpressionStatement(statement)) {
          problem(statement, `code outside a test: ${shorten(statement.getText(file))}`)
        } else {
          declarations.push(statement)
          emitted.push(statement)
        }
      } else if (/^describe(\.(only|skip|fixme|serial|parallel))?$/.test(kind)) {
        if (inDescribe)
          problem(call, 'a describe inside a describe - a spec has one level of test cases')
        else if (++describes > 1 || tests.length > 0) {
          problem(call, 'one describe per file, with every test inside it: a file becomes one spec')
        } else {
          suiteTitle = stringArgument(call, 0) ?? suiteTitle
          suiteTags.push(...tagsOf(call), ...modifierTag(kind))
          const fn = functionArgument(call)
          if (fn && ts.isBlock(fn.body)) visit(fn.body.statements, true)
          else problem(call, 'describe without a function body')
        }
      } else if (/^(test|only|skip|fixme)$/.test(kind)) {
        if (describes > 0 && !inDescribe) {
          problem(call, 'a test outside the describe: a file becomes one spec')
        } else {
          migrateTest(call, kind)
        }
      } else if (HOOKS[kind]) {
        migrateHook(call, HOOKS[kind])
      } else {
        problem(
          call,
          `${testName}.${kind}() has no place in a spec - set it in playwright.config.ts or a step`
        )
      }
    }
  }

  const migrateTest = (call: ts.CallExpression, kind: string) => {
    const title = stringArgument(call, 0)
    const fn = functionArgument(call)
    if (!title || !fn) return problem(call, 'a test needs a string title and a function')
    if (fn.parameters.length > 1) {
      return problem(call, `"${title}" uses testInfo - not available to step definitions`)
    }
    const fixtures = fixtureNames(fn)
    if (!fixtures) return problem(call, `"${title}": destructure the fixtures ({ page })`)
    if (!ts.isBlock(fn.body) || fn.body.statements.length === 0) {
      return problem(call, `"${title}" has no test.step`)
    }
    const titles: string[] = []
    for (const statement of fn.body.statements) {
      const stepCall =
        ts.isExpressionStatement(statement) &&
        ts.isAwaitExpression(statement.expression) &&
        testCall(statement.expression.expression) === 'step'
          ? (statement.expression.expression as ts.CallExpression)
          : null
      if (!stepCall) {
        problem(
          statement,
          `"${title}": code outside test.step - ${shorten(statement.getText(file))}`
        )
        continue
      }
      const step = migrateStep(stepCall, fixtures, title)
      if (step) titles.push(step)
    }
    tests.push({
      title,
      tags: [...tagsOf(call), ...modifierTag(kind)],
      steps: titles,
      layer: fixtures.includes('request') && !fixtures.includes('page') ? '@api' : '@ui'
    })
  }

  const migrateStep = (call: ts.CallExpression, fixtures: string[], test: string) => {
    const title = stringArgument(call, 0)
    const fn = functionArgument(call)
    if (!title || !fn || fn.parameters.length > 0) {
      return void problem(
        call,
        `"${test}": a step needs a string title and a function without parameters`
      )
    }
    const body = ts.isBlock(fn.body)
      ? fn.body.statements.map((statement) => statement.getText(file)).join('\n')
      : fn.body.getText(file)
    const used = identifiers(fn.body)
    const step: MigratedStep = {
      title,
      fixtures: fixtures.filter((name) => used.has(name)),
      body,
      line: lineOf(call)
    }
    const same = steps.get(title)
    if (same && normalize(same.body) !== normalize(body)) {
      return void problem(
        call,
        `step "${title}" has other code at line ${same.line} - one step text, one code`
      )
    }
    if (!same) {
      const existing = matchExisting(title)
      if (existing)
        return void problem(call, `step "${title}" matches the step definition at ${existing}`)
      steps.set(title, step)
      emitted.push(fn.body)
    }
    return title
  }

  const migrateHook = (call: ts.CallExpression, hook: string) => {
    const fn = functionArgument(call)
    if (!fn) return problem(call, `${hook} hook without a function`)
    if (fn.parameters.length > 1) return problem(call, `${hook} hook uses testInfo`)
    const params = fn.parameters.map((p) => p.getText(file)).join(', ')
    hooks.push(
      `${hook}({ tags: ${quoteString(`@${suite}`)} }, async (${params}) => ${fn.body.getText(file)})`
    )
    emitted.push(fn.body)
  }

  visit(file.statements, false)
  if (problems.length === 0 && tests.length === 0) problems.push('no test to migrate')
  if (problems.length > 0) {
    throw new Error(
      `${toPosix(sourcePath)} cannot be migrated:\n${problems.map((p) => `  - ${p}`).join('\n')}`
    )
  }

  // One layer for all tests goes on the suite, else each test carries its own
  const layers = new Set(tests.map((test) => test.layer))
  const lines = [
    [...(layers.size === 1 ? [...layers] : []), ...suiteTags].join(' '),
    `## ${suiteTitle}`
  ]
  for (const test of tests) {
    const tags = [...(layers.size > 1 ? [test.layer] : []), ...test.tags]
    lines.push(
      '---',
      tags.join(' '),
      `### ${test.title}`,
      ...test.steps.map((step) => `#### ${step}`)
    )
  }

  const used = new Set(emitted.flatMap((node) => [...identifiers(node)]))
  const bddNames = [...new Set(['Step', ...hooks.map((hook) => hook.slice(0, hook.indexOf('(')))])]
  // Packages first, then relative modules ('../' before './') - the order simple-import-sort keeps
  const kept = imports.flatMap((declaration) =>
    keptImport(declaration, used, testName, sourcePath, stepsDir, file)
  )
  const relative = [
    ...kept.filter((line) => / from '\./.test(line)),
    `import { ${bddNames.sort().join(', ')} } from './bdd'`
  ].sort((a, b) => {
    const [x, y] = [a, b].map((line) => line.slice(line.indexOf(' from ')))
    return x < y ? -1 : x > y ? 1 : 0 // by code point: localeCompare skips punctuation
  })
  const stepFile = [
    ...kept.filter((line) => !/ from '\./.test(line)),
    '',
    ...relative,
    '',
    ...declarations.map((statement) => statement.getText(file)),
    '',
    ...hooks,
    '',
    ...[...steps.values()].map(
      (step) =>
        `Step(${quoteString(escapeExpression(step.title))}, async ({ ${step.fixtures.join(', ')} }) => {\n${step.body}\n})\n`
    )
  ]

  return {
    markdown: formatMarkdownSpec(lines.filter(Boolean).join('\n')),
    steps: `${stepFile
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()}\n`,
    tests: tests.length,
    stepDefinitions: steps.size,
    warnings
  }
}

/** Literal step text as a Cucumber expression: `( ) { } /` and `\` are not syntax here */
export function escapeExpression(text: string): string {
  return text.replace(/[\\(){}/]/g, '\\$&')
}

/** Local name of an import of `name` (`import { test as base }` → "base") */
function namedImport(declaration: ts.ImportDeclaration, name: string): string | undefined {
  const bindings = declaration.importClause?.namedBindings
  if (!bindings || !ts.isNamedImports(bindings)) return undefined
  const element = bindings.elements.find((e) => (e.propertyName ?? e.name).text === name)
  return element?.name.text
}

/** An import with the names the step file uses; relative paths from the step file */
function keptImport(
  declaration: ts.ImportDeclaration,
  used: Set<string>,
  testName: string,
  sourcePath: string,
  stepsDir: string,
  file: ts.SourceFile
): string[] {
  let module = (declaration.moduleSpecifier as ts.StringLiteral).text
  if (module.startsWith('.')) {
    const target = path.resolve(path.dirname(sourcePath), module)
    module = toPosix(path.relative(stepsDir, target))
    if (!module.startsWith('.')) module = `./${module}`
  }
  const clause = declaration.importClause
  if (!clause) return [`import ${quoteString(module)}`] // side effects
  const parts: string[] = []
  if (clause.name && used.has(clause.name.text)) parts.push(clause.name.text)
  const bindings = clause.namedBindings
  if (bindings && ts.isNamespaceImport(bindings) && used.has(bindings.name.text)) {
    parts.push(`* as ${bindings.name.text}`)
  }
  if (bindings && ts.isNamedImports(bindings)) {
    const names = bindings.elements
      .filter((e) => e.name.text !== testName && used.has(e.name.text))
      .map((e) => e.getText(file))
    if (names.length > 0) parts.push(`{ ${names.join(', ')} }`)
  }
  if (parts.length === 0) return []
  return [
    `import ${clause.isTypeOnly ? 'type ' : ''}${parts.join(', ')} from ${quoteString(module)}`
  ]
}

/** Names of the destructured fixtures (`async ({ page, loginPage }) =>`); null when not destructured */
function fixtureNames(fn: ts.ArrowFunction | ts.FunctionExpression): string[] | null {
  const [first] = fn.parameters
  if (!first) return []
  if (!ts.isObjectBindingPattern(first.name)) return null
  return first.name.elements.map((e) => (e.propertyName ?? e.name).getText())
}

/** Identifiers a piece of code refers to - not the property names after a dot */
function identifiers(node: ts.Node): Set<string> {
  const names = new Set<string>()
  const walk = (child: ts.Node) => {
    if (
      ts.isIdentifier(child) &&
      !(ts.isPropertyAccessExpression(child.parent) && child.parent.name === child)
    ) {
      names.add(child.text)
    }
    ts.forEachChild(child, walk)
  }
  walk(node)
  return names
}

function stringArgument(call: ts.CallExpression, index: number): string | undefined {
  const argument = call.arguments[index]
  return argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
    ? argument.text
    : undefined
}

function functionArgument(
  call: ts.CallExpression
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  const last = call.arguments[call.arguments.length - 1]
  return last && (ts.isArrowFunction(last) || ts.isFunctionExpression(last)) ? last : undefined
}

/** Tags of `{ tag: '@smoke' }` or `{ tag: ['@smoke', '@slow'] }` */
function tagsOf(call: ts.CallExpression): string[] {
  const details = call.arguments.find(ts.isObjectLiteralExpression)
  const tag = details?.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === 'tag'
  )?.initializer
  if (!tag) return []
  const values = ts.isArrayLiteralExpression(tag) ? [...tag.elements] : [tag]
  return values.filter(ts.isStringLiteral).map((value) => value.text)
}

function modifierTag(kind: string): string[] {
  const modifier = kind.split('.').pop()
  return modifier === 'skip' || modifier === 'fixme' ? [`@${modifier}`] : []
}

function normalize(code: string): string {
  return code.replace(/\s+/g, ' ').trim()
}

function shorten(code: string): string {
  const line = code.split('\n')[0].trim()
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}
