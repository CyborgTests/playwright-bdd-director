/* eslint-disable no-console -- Playwright reporter: a failed report is printed, never thrown */
import type { Reporter, TestCase } from '@playwright/test/reporter'
import fs from 'fs'
import path from 'path'

import { CONFIG } from '../config'
import { getErrorMessage, toProjectPath } from '../utils/helpers'
import { type LastRunEntry, mergeLastRun, readLastRun, type RunOutcome } from './last-run'

const OUTCOMES: Record<ReturnType<TestCase['outcome']>, RunOutcome> = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped'
}

/** Latest result of every test per project for the coverage matrix (CONFIG.paths.lastRun) */
export default class LastRunReporter implements Reporter {
  private readonly tests = new Map<string, TestCase>()

  printsToStdio(): boolean {
    return false
  }

  onTestEnd(test: TestCase): void {
    this.tests.set(test.id, test) // retries: outcome() is read once the run is over
  }

  onEnd(): void {
    if (this.tests.size === 0) return
    const finishedAt = new Date().toISOString()
    const current = [...this.tests.values()].map(
      (test): LastRunEntry => ({
        file: toProjectPath(test.location.file),
        title: test.title,
        project: test.parent.project()?.name ?? '',
        outcome: OUTCOMES[test.outcome()],
        finishedAt
      })
    )
    try {
      const file = CONFIG.paths.lastRun
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(
        file,
        `${JSON.stringify(mergeLastRun(readLastRun(file), current), null, 2)}\n`
      )
    } catch (error: unknown) {
      console.error(`Last run results not written: ${getErrorMessage(error)}`)
    }
  }
}
