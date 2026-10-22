import { test } from '@playwright/test'

import { matchStepDefinitions, type StepMatch } from './registry'

/** Gherkin step keyword at the start of a step title (English) */
const STEP_KEYWORD = /^(Given|When|Then|And|But|\*)\s+/

/** Step argument as written by the generator: Gherkin DataTable rows or DocString */
export type StepArgument = { dataTable: string[][] } | { docString: string }

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
  argument?: StepArgument
): Promise<void> {
  const { definition, params } = findStepDefinition(title)
  const extra = argument === undefined ? [] : [toStepArgument(argument)]
  await test.step(title, async () => {
    await definition.fn(fixtures, ...params, ...extra)
  })
}

/**
 * The only definition matching step title
 * @throws Error listing locations of ambiguous definitions, or a hint for a missing one
 */
export function findStepDefinition(title: string): StepMatch {
  const text = stripStepKeyword(title)
  const matches = matchStepDefinitions(text)
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(
      `Missing step definition for "${title}"\n  Fix: Run npm run stage for a snippet`
    )
  }
  throw new Error(formatAmbiguous(title, matches))
}

export function stripStepKeyword(title: string): string {
  return title.replace(STEP_KEYWORD, '')
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

function toStepArgument(argument: StepArgument): DataTable | string {
  return 'dataTable' in argument ? new DataTable(argument.dataTable) : argument.docString
}
