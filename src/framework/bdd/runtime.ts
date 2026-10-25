import { dialects } from '@cucumber/gherkin'
import { test, type TestInfo } from '@playwright/test'

import {
  BDD_CONTEXT,
  type BddContext,
  type BddStep,
  getHookDefinitions,
  type HookDefinition,
  type HookKind,
  matchStepDefinitions,
  type StepDefinition,
  type StepMatch
} from './registry'

/**
 * Third argument of autoStep: Gherkin DataTable rows or DocString of the step (passed to the step
 * function last), the spec language for a non-English title (`Soit …` → `fr`); `keyword: false`
 * for a Markdown step whose text starts with a word like "Given"
 */
export interface StepOptions {
  dataTable?: string[][]
  docString?: string
  language?: string // Gherkin dialect code (`# language: uk`), English by default
  keyword?: false // title is the step text as is - Markdown steps have no keyword
}

/**
 * Gherkin DataTable passed to a step function as last argument
 */
export class DataTable {
  constructor(private readonly cells: string[][]) {}

  /** All rows, header included */
  raw(): string[][] {
    return this.cells.map((row) => [...row])
  }

  /** Rows without header */
  rows(): string[][] {
    return this.raw().slice(1)
  }

  /** One object per row, keys from header */
  hashes(): Record<string, string>[] {
    const [header = [], ...rows] = this.cells
    return rows.map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])))
  }

  /** Two-column table as object: first column keys, second values */
  rowsHash(): Record<string, string> {
    return Object.fromEntries(this.cells.map(([key, value]) => [key, value]))
  }
}

/**
 * Automated step of a generated test: runs the step definition matching the title ("Given user
 * opens the home page", Markdown "Open Home Page") as a test.step with that title, inside
 * BeforeStep / AfterStep hooks registered for the test (useStepHook). A step without definition
 * is a `manualStep` instead - a person walks it. Fixtures are those the definition destructures -
 * the generator passes them.
 * @throws Error for no matching definition, several matching ones or a definition without code
 */
export async function autoStep(
  title: string,
  fixtures: Record<string, unknown> = {},
  options: StepOptions = {}
): Promise<void> {
  const { definition, params } = findStepDefinition(
    options.keyword === false ? title : stripStepKeyword(title, options.language)
  )
  if (definition.pending) {
    throw new Error(`Step definition at ${definition.location} has no code
  Fix: Implement it - until then generated tests walk the step by hand`)
  }
  const args = [...params, ...toStepArgument(options)]
  const testInfo = test.info()
  const stepHooks = stepHooksByTest.get(testInfo) ?? []
  const before = stepHooks.filter(({ hook }) => hook.kind === 'BeforeStep')
  const after = stepHooks.filter(({ hook }) => hook.kind === 'AfterStep').reverse()

  await test.step(title, async (stepInfo) => {
    let skipped = false
    const step: BddStep = {
      title,
      skip: (description) => {
        skipped = true
        stepInfo.skip(true, description)
      },
      attach: (name, attachment) => stepInfo.attach(name, attachment)
    }
    const context = toContext(testInfo, step)

    let failure: { error: unknown } | undefined
    let skip: { error: unknown } | undefined
    try {
      for (const { hook, fixtures: hookFixtures } of before) {
        await callHook(hook, hookFixtures, context)
      }
      await callStep(definition, fixtures, args, context)
    } catch (error: unknown) {
      if (skipped) skip = { error }
      else failure = { error }
    }

    // AfterStep runs for a failed or skipped step too and sees the error; it cannot skip the step
    step.error = failure?.error
    step.skip = () => {
      throw new Error(`AfterStep hook cannot skip step "${title}"
  Fix: Skip in BeforeStep or the step`)
    }
    for (const { hook, fixtures: hookFixtures } of after) {
      try {
        await callHook(hook, hookFixtures, context)
      } catch (error: unknown) {
        failure ??= { error }
      }
    }

    if (failure) throw failure.error
    if (skip) throw skip.error // Playwright marks the step skipped
  })
}

/**
 * Run hook chosen by the generator (title from the registry). Its Playwright hook (beforeEach,
 * afterAll, ...) gives the report entry, so no extra test.step.
 * @throws Error when the hook was renamed or removed since the test was generated
 */
export async function runHook(
  kind: HookKind,
  title: string,
  fixtures: Record<string, unknown> = {}
): Promise<void> {
  const hook = findHook(kind, title)
  // test.info() only when used: it throws outside a Playwright test
  const context = hook.fixtureNames.includes(BDD_CONTEXT) ? toContext(test.info()) : undefined
  await callHook(hook, fixtures, context)
}

/**
 * Register a BeforeStep / AfterStep hook for the current test - every autoStep of the test (and its
 * Backgrounds) runs it. Called from a beforeEach the generator emits before the Backgrounds.
 * @throws Error when the hook was renamed or removed since the test was generated
 */
export function useStepHook(
  kind: Extract<HookKind, 'BeforeStep' | 'AfterStep'>,
  title: string,
  fixtures: Record<string, unknown> = {}
): void {
  const testInfo = test.info()
  const registered = stepHooksByTest.get(testInfo) ?? []
  registered.push({ hook: findHook(kind, title), fixtures })
  stepHooksByTest.set(testInfo, registered)
}

const stepHooksByTest = new WeakMap<
  TestInfo,
  Array<{ hook: HookDefinition; fixtures: Record<string, unknown> }>
>()

function findHook(kind: HookKind, title: string): HookDefinition {
  const hook = getHookDefinitions().find((h) => h.kind === kind && h.title === title)
  if (!hook) {
    throw new Error(`Missing ${kind} hook "${title}"
  Fix: Run the tests again - they are generated on every run`)
  }
  return hook
}

function toContext(testInfo: TestInfo, step?: BddStep): BddContext {
  return { tags: testInfo.tags, scenario: testInfo.title, testInfo, step }
}

/** Fixture style gets fixtures with `bdd`; world style the world as `this`; a method its object */
async function callStep(
  definition: StepDefinition,
  fixtures: Record<string, unknown>,
  args: unknown[],
  context: BddContext
): Promise<void> {
  const { method, world } = definition
  if (method) {
    const target = Object.values(fixtures).find((value) => value instanceof method.owner)
    if (!target) {
      throw new Error(
        `No ${method.owner.name} object for step at ${definition.location}
  Fix: Run the tests again - they are generated on every run`
      )
    }
    await (target as Record<string | symbol, (...a: unknown[]) => unknown>)[method.name](...args)
    return
  }
  if (world) {
    await definition.fn.call(fixtures[world], ...args)
    return
  }
  await definition.fn({ ...fixtures, [BDD_CONTEXT]: context }, ...args)
}

async function callHook(
  hook: HookDefinition,
  fixtures: Record<string, unknown>,
  context: BddContext | undefined
): Promise<void> {
  if (hook.world) await hook.fn.call(fixtures[hook.world])
  else await hook.fn({ ...fixtures, [BDD_CONTEXT]: context })
}

/**
 * The only definition matching step text (without keyword)
 * @throws Error listing locations of ambiguous definitions, or a hint for a missing one
 */
export function findStepDefinition(text: string): StepMatch {
  const matches = matchStepDefinitions(text)
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(`Missing step definition for "${text}"\n  Fix: npm run steps <suite>`)
  }
  throw new Error(formatAmbiguous(text, matches))
}

/**
 * Step text without its keyword: "Given user …" → "user …", "Soit user …" with language "fr"
 * @throws Error for an unknown language code
 */
export function stripStepKeyword(title: string, language = 'en'): string {
  return splitStepKeyword(title, language)?.text ?? title
}

/** Keyword followed by whitespace: "And user" yes, "Andrew" / "And" alone no */
function startsWithKeyword(title: string, keyword: string): boolean {
  return title.startsWith(keyword) && /\s/.test(title.charAt(keyword.length))
}

/**
 * Keyword and text of a step title ("Given user …" → "Given", "user …"), null without a keyword
 * of the language
 */
export function splitStepKeyword(
  title: string,
  language = 'en'
): { keyword: string; text: string } | null {
  const keyword = getStepKeywords(language).find((candidate) => startsWithKeyword(title, candidate))
  return keyword ? { keyword, text: title.slice(keyword.length).trimStart() } : null
}

const keywordsByLanguage = new Map<string, string[]>()

/** Step keywords of a Gherkin dialect, trimmed, longest first ("Étant donné que" before "Étant donné") */
function getStepKeywords(language: string): string[] {
  let keywords = keywordsByLanguage.get(language)
  if (!keywords) {
    const dialect = dialects[language]
    if (!dialect) {
      throw new Error(
        `Unknown Gherkin language "${language}"\n  Fix: Use a code from # language: (en, uk, de, ...)`
      )
    }
    const all = [...dialect.given, ...dialect.when, ...dialect.then, ...dialect.and, ...dialect.but]
    keywords = [...new Set(all.map((keyword) => keyword.trim()))].sort(
      (a, b) => b.length - a.length
    )
    keywordsByLanguage.set(language, keywords)
  }
  return keywords
}

export function formatAmbiguous(title: string, matches: StepMatch[]): string {
  const locations = matches
    .map(
      ({ definition }) =>
        `    ${definition.keyword}(${formatPattern(definition.pattern)}) - ${definition.location}`
    )
    .join('\n')
  return `Ambiguous step "${title}" matches ${matches.length} definitions:\n${locations}\n  Fix: Make the patterns distinct`
}

function formatPattern(pattern: string | RegExp): string {
  return typeof pattern === 'string' ? `'${pattern}'` : String(pattern)
}

function toStepArgument({ dataTable, docString }: StepOptions): Array<DataTable | string> {
  if (dataTable) return [new DataTable(dataTable)]
  return docString === undefined ? [] : [docString]
}
