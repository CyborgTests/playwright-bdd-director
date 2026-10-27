import fs from 'fs'

import { CONFIG } from '../config'

/** Playwright outcome of a test on one project: a known bug (`@fail`) failing as expected passes */
export type RunOutcome = 'passed' | 'failed' | 'flaky' | 'skipped'

export interface LastRunEntry {
  file: string // generated test file, `/`-separated: ".director/tests/cart.test.ts"
  title: string
  project: string
  outcome: RunOutcome
  finishedAt: string // ISO, end of the run
}

/**
 * Latest result of every test on every project: a run replaces the results of the tests it ran
 * and keeps the others, so `play cyborg` after `play auto` leaves the automated results in place
 */
export function mergeLastRun(previous: LastRunEntry[], current: LastRunEntry[]): LastRunEntry[] {
  const key = (entry: LastRunEntry) => `${entry.file}\n${entry.title}\n${entry.project}`
  const replaced = new Set(current.map(key))
  return [...previous.filter((entry) => !replaced.has(key(entry))), ...current].sort((a, b) =>
    key(a).localeCompare(key(b))
  )
}

/** Results written by the last-run reporter, none when nothing ran yet or the file is broken */
export function readLastRun(file: string = CONFIG.paths.lastRun): LastRunEntry[] {
  try {
    const entries: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return Array.isArray(entries) ? (entries as LastRunEntry[]) : []
  } catch {
    return []
  }
}
