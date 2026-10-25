import {
  CucumberExpression,
  type Expression,
  ParameterType,
  ParameterTypeRegistry,
  RegularExpression
} from '@cucumber/cucumber-expressions'
import type { TestInfo, TestType } from '@playwright/test'
import path from 'path'

import { toProjectPath } from '../utils/helpers'

export type StepKeyword = 'Given' | 'When' | 'Then' | 'Step'

/**
 * Where a step or hook runs - destructure `bdd` next to fixtures: `async ({ page, bdd }) => ...`.
 * Given by the runtime, not a Playwright fixture.
 */
export interface BddContext {
  tags: readonly string[] // tags of the test: spec tags, its layer, kind (@auto / @cyborg) and suite
  scenario: string // test title
  testInfo: TestInfo
  step?: BddStep // steps and BeforeStep / AfterStep hooks
}

export interface BddStep {
  title: string // with keyword: "Given user opens the home page"
  error?: unknown // AfterStep: error of the step, undefined when it passed
  skip: (description?: string) => void // step and BeforeStep: mark the step skipped, the test goes on
  attach: TestInfo['attach'] // attachment of the step in the report
}

/** Reserved name of the context in the first parameter - never requested as a fixture */
export const BDD_CONTEXT = 'bdd'

type WithContext<Fixtures> = Fixtures & { bdd: BddContext }

/** Step function: fixtures object first (destructured), then expression parameters, then DataTable / DocString */
type StepFunction<Fixtures> = (fixtures: Fixtures, ...args: never[]) => unknown

/** Step function called directly (from a test or another step): only the fixtures it uses */
export type StepCall<Fixtures, Fn> = Fn extends (fixtures: never, ...args: infer Args) => infer R
  ? (fixtures: Partial<Fixtures>, ...args: Args) => R
  : never

/** World style: `this` is the world fixture, expression parameters only */
type WorldStepFunction<World> = (this: World, ...args: never[]) => unknown

/** Method decorator of a Page Object registered with @StepsFor */
export type StepDecorator = (
  method: (...args: never[]) => unknown,
  context: ClassMethodDecoratorContext
) => void

interface DefineStep<Fixtures> {
  <Fn extends StepFunction<WithContext<Fixtures>>>(
    pattern: string | RegExp,
    fn: Fn
  ): StepCall<WithContext<Fixtures>, Fn>
  (pattern: string | RegExp): StepDecorator
}

interface DefineWorldStep<World> {
  <Fn extends WorldStepFunction<World>>(pattern: string | RegExp, fn: Fn): Fn
  (pattern: string | RegExp): StepDecorator
}

export interface StepDefinition {
  keyword: StepKeyword
  pattern: string | RegExp
  expression: Expression
  fn: (this: unknown, ...args: unknown[]) => unknown
  fixtureNames: string[] // read from the first parameter - the generated test requests them
  location: string // "src/steps/auth.steps.ts:12"
  world?: string // world style: fixture passed as `this`, no fixtures parameter
  method?: { owner: PomClass; name: string | symbol } // Page Object method decorated with @Given ...
  pending: boolean // no code in the body yet - the step stays manual (see hasNoCode)
}

export type HookKind = 'Before' | 'After' | 'BeforeAll' | 'AfterAll' | 'BeforeStep' | 'AfterStep'

export interface HookOptions {
  tags?: string // tag expression: '@auth and not @api'; none - every scenario (BeforeAll/AfterAll: feature)
  name?: string // title in reports and the generated test
}

interface DefineHook<Fn> {
  (fn: Fn): void
  (options: HookOptions, fn: Fn): void
}

export interface HookDefinition {
  kind: HookKind
  title: string // name, else "<file>#<n>" - n-th hook of this kind in the file (stable when lines move)
  tags?: string
  fn: (this: unknown, ...args: unknown[]) => unknown
  fixtureNames: string[]
  location: string
  world?: string
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- any class, abstract too
export type PomClass = Function

/** Page Object class whose decorated methods are steps, with the fixture that creates it */
export interface PomNode {
  owner: PomClass
  fixture: string
  tags?: string // tag expression: this subclass is used instead of its base for matching scenarios
  location: string
}

export interface StepsForOptions {
  tags?: string
}

export interface StepMatch {
  definition: StepDefinition
  params: unknown[]
}

interface PendingMethod {
  keyword: StepKeyword
  pattern: string | RegExp
  name: string | symbol
  location: string
}

const STEP_METHODS = Symbol('bdd step methods')

const parameterTypes = new ParameterTypeRegistry()
const definitions: StepDefinition[] = []
const hooks: HookDefinition[] = []
const poms: PomNode[] = []

/**
 * Step definition and hook functions bound to fixtures of a Playwright `test` (types only - the
 * generated test passes the fixtures each step destructures):
 * `export const { Given, When, Then, Before } = createBdd(test)`.
 * Steps return the step function to call it directly; `Given('…')` alone decorates a Page Object
 * method (see StepsFor). BeforeAll / AfterAll get worker fixtures only (`browser`, not `page`).
 * With `{ world: 'world' }` steps and hooks are Cucumber style: `function (this: World, email)`.
 */
export function createBdd<TestArgs extends object, WorkerArgs extends object>(
  test: TestType<TestArgs, WorkerArgs>
): {
  Given: DefineStep<TestArgs & WorkerArgs>
  When: DefineStep<TestArgs & WorkerArgs>
  Then: DefineStep<TestArgs & WorkerArgs>
  Step: DefineStep<TestArgs & WorkerArgs>
  Before: DefineHook<(fixtures: WithContext<TestArgs & WorkerArgs>) => unknown>
  After: DefineHook<(fixtures: WithContext<TestArgs & WorkerArgs>) => unknown>
  BeforeStep: DefineHook<(fixtures: WithContext<TestArgs & WorkerArgs>) => unknown>
  AfterStep: DefineHook<(fixtures: WithContext<TestArgs & WorkerArgs>) => unknown>
  BeforeAll: DefineHook<(fixtures: WorkerArgs) => unknown>
  AfterAll: DefineHook<(fixtures: WorkerArgs) => unknown>
  StepsFor: (fixture: keyof TestArgs & string, options?: StepsForOptions) => StepsForDecorator
}
export function createBdd<
  TestArgs extends object,
  WorkerArgs extends object,
  WorldName extends keyof TestArgs & string
>(
  test: TestType<TestArgs, WorkerArgs>,
  options: { world: WorldName }
): {
  Given: DefineWorldStep<TestArgs[WorldName]>
  When: DefineWorldStep<TestArgs[WorldName]>
  Then: DefineWorldStep<TestArgs[WorldName]>
  Step: DefineWorldStep<TestArgs[WorldName]>
  Before: DefineHook<(this: TestArgs[WorldName]) => unknown>
  After: DefineHook<(this: TestArgs[WorldName]) => unknown>
  BeforeStep: DefineHook<(this: TestArgs[WorldName]) => unknown>
  AfterStep: DefineHook<(this: TestArgs[WorldName]) => unknown>
  BeforeAll: DefineHook<(fixtures: WorkerArgs) => unknown>
  AfterAll: DefineHook<(fixtures: WorkerArgs) => unknown>
  StepsFor: (fixture: keyof TestArgs & string, options?: StepsForOptions) => StepsForDecorator
}
export function createBdd(_test: unknown, options: { world?: string } = {}): unknown {
  const { world } = options
  const hook = (kind: HookKind) => hookDefiner(kind, kind.endsWith('All') ? undefined : world)
  return {
    Given: stepDefiner('Given', world),
    When: stepDefiner('When', world),
    Then: stepDefiner('Then', world),
    Step: stepDefiner('Step', world),
    Before: hook('Before'),
    After: hook('After'),
    BeforeStep: hook('BeforeStep'),
    AfterStep: hook('AfterStep'),
    BeforeAll: hook('BeforeAll'),
    AfterAll: hook('AfterAll'),
    StepsFor
  }
}

/**
 * Steps and StepsFor without fixture types - for Page Objects: importing the typed ones from the
 * steps file would be an import cycle (steps → fixtures → Page Objects → steps)
 */
export const Given = stepDefiner('Given') as DefineStep<Record<string, unknown>>
export const When = stepDefiner('When') as DefineStep<Record<string, unknown>>
export const Then = stepDefiner('Then') as DefineStep<Record<string, unknown>>
export const Step = stepDefiner('Step') as DefineStep<Record<string, unknown>>

type StepsForDecorator = (owner: PomClass, context: ClassDecoratorContext) => void

/**
 * Page Object class with step methods, created by the fixture:
 * `@StepsFor('homePage') class HomePage { @Given('user opens the home page') async open() {} }`.
 * Steps of a base class run on a subclass registered for a fixture too: with `tags` that subclass
 * is used for matching scenarios (`@StepsFor('mobileHomePage', { tags: '@mobile' })`), and in a
 * scenario that uses a subclass fixture its base class steps run on the same object.
 */
export function StepsFor(fixture: string, options: StepsForOptions = {}): StepsForDecorator {
  const location = getCallerLocation()
  return (owner, context) => {
    const duplicate = poms.find((node) => node.fixture === fixture)
    if (duplicate) {
      throw new Error(
        `Fixture "${fixture}" has two step classes: ${duplicate.location}, ${location}\n  Fix: Register each fixture once`
      )
    }
    poms.push({ owner, fixture, tags: options.tags?.trim() || undefined, location })
    const metadata = context.metadata as Record<symbol, PendingMethod[]> | undefined
    const methods = metadata && Object.hasOwn(metadata, STEP_METHODS) ? metadata[STEP_METHODS] : []
    for (const method of methods) {
      // Override of a base class step: the call on the object runs the override anyway
      const inherited = definitions.some(
        (definition) =>
          definition.method &&
          definition.keyword === method.keyword &&
          String(definition.pattern) === String(method.pattern) &&
          owner.prototype instanceof definition.method.owner
      )
      if (inherited) continue
      addStepDefinition(method.keyword, method.pattern, owner.prototype[method.name], {
        location: method.location,
        method: { owner, name: method.name }
      })
    }
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

/** Step definitions in definition order */
export function getStepDefinitions(): readonly StepDefinition[] {
  return definitions
}

/** Hooks in definition order */
export function getHookDefinitions(): readonly HookDefinition[] {
  return hooks
}

/** Page Object classes registered with StepsFor */
export function getPomNodes(): readonly PomNode[] {
  return poms
}

export function getParameterTypes(): ParameterTypeRegistry {
  return parameterTypes
}

/** Tests only: forget registered steps, hooks and Page Objects (parameter types stay) */
export function clearStepDefinitions(): void {
  definitions.length = 0
  hooks.length = 0
  poms.length = 0
}

function stepDefiner(keyword: StepKeyword, world?: string) {
  return (pattern: string | RegExp, fn?: StepDefinition['fn']): unknown => {
    if (fn) {
      addStepDefinition(keyword, pattern, fn, { location: getCallerLocation(), world })
      return fn
    }
    const location = getCallerLocation()
    const decorator: StepDecorator = (_method, context) => {
      if (context.static || context.private) {
        throw new Error(
          `Step "${String(pattern)}" at ${location} decorates a static or private method\n  Fix: Decorate a public instance method`
        )
      }
      const metadata = context.metadata as Record<symbol, PendingMethod[]> | undefined
      if (!metadata) {
        throw new Error(
          `Step "${String(pattern)}" at ${location}: decorator metadata is not supported
  Fix: Use TypeScript 5.2+ decorators without experimentalDecorators`
        )
      }
      if (!Object.hasOwn(metadata, STEP_METHODS)) metadata[STEP_METHODS] = []
      metadata[STEP_METHODS].push({ keyword, pattern, name: context.name, location })
    }
    return decorator
  }
}

function hookDefiner(kind: HookKind, world?: string) {
  return (optionsOrFn: HookOptions | HookDefinition['fn'], fn?: HookDefinition['fn']): void =>
    typeof optionsOrFn === 'function'
      ? addHook(kind, {}, optionsOrFn, world)
      : addHook(kind, optionsOrFn, fn!, world)
}

function addStepDefinition(
  keyword: StepKeyword,
  pattern: string | RegExp,
  fn: StepDefinition['fn'],
  { location, world, method }: Pick<StepDefinition, 'location' | 'world' | 'method'>
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
    // A method gets the fixture of its Page Object, chosen by the generator per scenario
    fixtureNames: method ? [] : world ? [world] : parseFixtureNames(fn),
    location,
    world,
    method,
    pending: hasNoCode(fn)
  })
}

function addHook(
  kind: HookKind,
  options: HookOptions,
  fn: HookDefinition['fn'],
  world?: string
): void {
  const location = getCallerLocation()
  const file = location.replace(/:\d+$/, '').replace(/\.ts$/, '')
  const index = hooks.filter((h) => h.kind === kind && h.location.startsWith(`${file}.`)).length
  const title = options.name?.trim() || `${file}#${index + 1}`
  const duplicate = hooks.find((h) => h.kind === kind && h.title === title)
  if (duplicate) {
    throw new Error(
      `Duplicate ${kind} hook "${title}": ${duplicate.location}, ${location}\n  Fix: Give the hooks distinct names`
    )
  }
  hooks.push({
    kind,
    title,
    tags: options.tags?.trim() || undefined,
    fn,
    fixtureNames: world ? [world] : parseFixtureNames(fn),
    location,
    world
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
 * Function body without a single statement - empty or comments only, `// TODO` included: such a
 * definition counts as none, its step stays manual. An expression body (`() => page`) is code.
 */
export function hasNoCode(fn: (...args: never[]) => unknown): boolean {
  const source = fn.toString()
  let end = source.indexOf('(')
  if (end < 0) return false
  for (let depth = 0; end < source.length; end++) {
    if ('{[('.includes(source[end])) depth++
    if ('}])'.includes(source[end]) && --depth === 0) break
  }
  const rest = source
    .slice(end + 1)
    .replace(/^\s*=>/, '')
    .trimStart()
  if (!rest.startsWith('{')) return false
  const body = rest.slice(1, rest.lastIndexOf('}'))
  return body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim() === ''
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
    return `${toProjectPath(file)}:${match[2]}`
  }
  return 'unknown location'
}
