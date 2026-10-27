/* eslint-disable no-console -- Playwright reporter: a failed report is printed, never thrown */
import type { FullConfig, Reporter, TestCase } from '@playwright/test/reporter'
import fs from 'fs'
import path from 'path'

import { type BuildResult, buildTests } from '../bdd/build'
import { CONFIG } from '../config'
import { getErrorMessage, toPosix, toProjectPath } from '../utils/helpers'
import { getIcon } from '../utils/icons'
import { buildCoverageMatrix } from './coverage-matrix'
import type { RunProject } from './dress-report'
import { type LastRunEntry, mergeLastRun, readLastRun, type RunOutcome } from './last-run'
import { isRunRecorded, writeRunSnapshot } from './run-history'

const OUTCOMES: Record<ReturnType<TestCase['outcome']>, RunOutcome> = {
  expected: 'passed',
  unexpected: 'failed',
  flaky: 'flaky',
  skipped: 'skipped'
}

/**
 * Latest result of every test per project for the coverage matrix (CONFIG.paths.lastRun); a
 * recorded run also keeps its own coverage matrix in the run history (run-history.ts)
 */
export default class LastRunReporter implements Reporter {
  private readonly tests = new Map<string, TestCase>()
  private projects: RunProject[] = []
  private build: Promise<BuildResult> | undefined

  printsToStdio(): boolean {
    return false
  }

  onBegin(config: FullConfig): void {
    this.projects = config.projects
    // The specs as this run generated its tests, not as they are edited while it runs
    this.build = isRunRecorded() ? buildTests() : undefined
  }

  onTestEnd(test: TestCase): void {
    this.tests.set(test.id, test) // retries: outcome() is read once the run is over
  }

  async onEnd(): Promise<void> {
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

    if (!this.build) return
    try {
      const matrix = buildCoverageMatrix(await this.build, current, this.projects)
      const file = writeRunSnapshot(matrix, finishedAt)
      console.log(`${getIcon('success')}  Run recorded: ${toPosix(file)}`)
    } catch (error: unknown) {
      console.error(`Run not recorded: ${getErrorMessage(error)}`)
    }
  }
}
