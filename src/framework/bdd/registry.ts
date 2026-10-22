import {
  CucumberExpression,
  type Expression,
  ParameterType,
  ParameterTypeRegistry,
  RegularExpression
} from '@cucumber/cucumber-expressions'
import type { TestType } from '@playwright/test'
import path from 'path'

export type StepKeyword = 'Given' | 'When' | 'Then' | 'Step'

/** Step function: fixtures object first (destructured), then expression parameters, then DataTable / DocString */
type StepFunction<Fixtures> = (fixtures: Fixtures, ...args: never[]) => unknown

export interface StepDefinition {
  keyword: StepKeyword
  pattern: string | RegExp
  expression: Expression
  fn: (fixtures: Record<string, unknown>, ...args: unknown[]) => unknown
  fixtureNames: string[] // read from the first parameter - the generated test requests them
  location: string // "src/steps/auth.steps.ts:12"
}

export interface StepMatch {
  definition: StepDefinition
  params: unknown[]
}

const parameterTypes = new ParameterTypeRegistry()
const definitions: StepDefinition[] = []

/**
 * Step definition functions bound to fixtures of a Playwright `test` (types only - the generated
 * test passes the fixtures each step destructures):
 * `export const { Given, When, Then } = createBdd(test)`
 */
export function createBdd<TestArgs extends object, WorkerArgs extends object>(
  _test: TestType<TestArgs, WorkerArgs>
) {
  type Define = (pattern: string | RegExp, fn: StepFunction<TestArgs & WorkerArgs>) => void
  const define =
    (keyword: StepKeyword): Define =>
    (pattern, fn) =>
      addStepDefinition(keyword, pattern, fn as StepDefinition['fn'])
  return {
    Given: define('Given'),
    When: define('When'),
    Then: define('Then'),
    Step: define('Step')
  }
}

/**
 * Custom `{name}` parameter for Cucumber Expressions, e.g. `{color}` → `red|green`
 */
export function defineParameterType<T>({
  name,
  regexp,
  transformer,
  useForSnippets = true
}: {
  name: string
  regexp: RegExp | string | readonly (RegExp | string)[]
  transformer?: (...match: string[]) => T
  useForSnippets?: boolean
}): void {
  parameterTypes.defineParameterType(
    new ParameterType(
      name,
      regexp,
      null,
      transformer ?? ((value) => value as T),
      useForSnippets,
      false
    )
  )
}

/**
 * All definitions whose expression matches step text (without keyword - it does not affect search)
 */
export function matchStepDefinitions(text: string): StepMatch[] {
  return definitions.flatMap((definition) => {
    const args = definition.expression.match(text)
    return args ? [{ definition, params: args.map((arg) => arg.getValue(null)) }] : []
  })
}

export function getStepDefinitions(): readonly StepDefinition[] {
  return definitions
}

export function getParameterTypes(): ParameterTypeRegistry {
  return parameterTypes
}

/** Tests only: forget registered steps (parameter types stay) */
export function clearStepDefinitions(): void {
  definitions.length = 0
}

function addStepDefinition(
  keyword: StepKeyword,
  pattern: string | RegExp,
  fn: StepDefinition['fn']
): void {
  const expression =
    typeof pattern === 'string'
      ? new CucumberExpression(pattern, parameterTypes)
      : new RegularExpression(pattern, parameterTypes)
  definitions.push({
    keyword,
    pattern,
    expression,
    fn,
    fixtureNames: parseFixtureNames(fn),
    location: getCallerLocation()
  })
}

/**
 * Fixture names from the first parameter of step function: `async ({ page, loginPage }, ...)`.
 * Playwright resolves fixtures by the destructured names of the test function, so the generated
 * test must name them - the step lists them explicitly the same way.
 * @throws Error for `...rest` - the names would be unknown
 */
export function parseFixtureNames(fn: (...args: never[]) => unknown): string[] {
  const source = fn.toString()
  const open = source.indexOf('(')
  if (open < 0 || source.slice(open + 1).trimStart()[0] !== '{') return []

  const start = source.indexOf('{', open)
  let depth = 0
  let end = start
  for (; end < source.length; end++) {
    if ('{[('.includes(source[end])) depth++
    if ('}])'.includes(source[end]) && --depth === 0) break
  }

  const names: string[] = []
  depth = 0
  let current = ''
  for (const char of source.slice(start + 1, end) + ',') {
    if ('{[('.includes(char)) depth++
    if ('}])'.includes(char)) depth--
    if (char === ',' && depth === 0) {
      const part = current.trim()
      if (part.startsWith('...')) {
        throw new Error(
          `Step fixtures cannot use rest syntax: "${part}"\n  Fix: List every fixture: async ({ page, loginPage }) => ...`
        )
      }
      if (part) names.push(part.split(/[:=]/)[0].trim())
      current = ''
    } else {
      current += char
    }
  }
  return names
}

/**
 * "file:line" of the step definition call - first stack frame outside this module
 */
function getCallerLocation(): string {
  const frames = (new Error().stack ?? '').split('\n').slice(1)
  for (const frame of frames) {
    const match = frame.match(/\(?((?:[a-zA-Z]:)?[^():]+):(\d+):\d+\)?$/)
    if (!match) continue
    const file = match[1].replace(/^file:\/\/\/?/, '').trim()
    if (file.includes(`${path.sep}bdd${path.sep}registry`) || file.includes('/bdd/registry')) {
      continue
    }
    return `${path.relative(process.cwd(), file).split(path.sep).join('/')}:${match[2]}`
  }
  return 'unknown location'
}
