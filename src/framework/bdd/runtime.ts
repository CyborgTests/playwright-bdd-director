import { dialects } from '@cucumber/gherkin'
import { test } from '@playwright/test'

import { getHookDefinitions, type HookKind, matchStepDefinitions, type StepMatch } from './registry'

/**
 * Third argument of runStep: Gherkin DataTable rows or DocString of the step (passed to the step
 * function last), and the spec language for a non-English title (`Дано …` → `uk`)
 */
export interface StepOptions {
  dataTable?: string[][]
  docString?: string
  language?: string // Gherkin dialect code (`# language: uk`), English by default
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
 * Run step definition matching step title ("Given user opens home page") as a test.step with
 * that title. Fixtures are those the definition destructures - the generator passes them.
 * @throws Error for no matching definition or several matching ones
 */
export async function runStep(
  title: string,
  fixtures: Record<string, unknown> = {},
  options: StepOptions = {}
): Promise<void> {
  const { definition, params } = findStepDefinition(title, options.language)
  const extra = toStepArgument(options)
  await test.step(title, async () => {
    await definition.fn(fixtures, ...params, ...extra)
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
  const hook = getHookDefinitions().find((h) => h.kind === kind && h.title === title)
  if (!hook) {
    throw new Error(`Missing ${kind} hook "${title}"\n  Fix: Run npm run stage to regenerate tests`)
  }
  await hook.fn(fixtures)
}

/**
 * The only definition matching step title
 * @throws Error listing locations of ambiguous definitions, or a hint for a missing one
 */
export function findStepDefinition(title: string, language?: string): StepMatch {
  const text = stripStepKeyword(title, language)
  const matches = matchStepDefinitions(text)
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(
      `Missing step definition for "${title}"\n  Fix: Run npm run stage for a snippet`
    )
  }
  throw new Error(formatAmbiguous(title, matches))
}

/**
 * Step text without its keyword: "Given user …" → "user …", "Дано user …" with language "uk"
 * @throws Error for an unknown language code
 */
export function stripStepKeyword(title: string, language = 'en'): string {
  const keyword = getStepKeywords(language).find((candidate) => startsWithKeyword(title, candidate))
  return keyword ? title.slice(keyword.length).trimStart() : title
}

/** Keyword followed by whitespace: "And user" yes, "Andrew" / "And" alone no */
function startsWithKeyword(title: string, keyword: string): boolean {
  return title.startsWith(keyword) && /\s/.test(title.charAt(keyword.length))
}

/** Title starts with a step keyword of the language */
export function hasStepKeyword(title: string, language = 'en'): boolean {
  return getStepKeywords(language).some((keyword) => startsWithKeyword(title, keyword))
}

/** Title starts with a step keyword of some language, but not an English one */
export function isNonEnglishStepTitle(title: string): boolean {
  return (
    !hasStepKeyword(title) &&
    Object.keys(dialects).some((code) => code !== 'en' && hasStepKeyword(title, code))
  )
}

const keywordsByLanguage = new Map<string, string[]>()

/** Step keywords of a Gherkin dialect, trimmed, longest first ("Припустимо, що" before "Припустимо") */
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
