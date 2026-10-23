/* eslint-disable no-console -- Playwright reporter: a failed report is printed, never thrown */
import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter'
import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import { SPEC_FILE_GLOB } from '../constants/markdown'
import { parseGherkinDocument } from '../core/gherkin-parser'
import { parseMDFile } from '../core/md-parser'
import { getErrorMessage, getMarkdownBaseName, getTestFileBaseName } from '../utils/helpers'
import { buildCucumberReport, type RunSpec, type RunStep, type TestRun } from './cucumber-report'

const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g')

/**
 * Cucumber JSON of every run (CONFIG.paths.cucumberReport) for test management tools: each test
 * is reported with the structure of its spec (Markdown or Gherkin), see buildCucumberReport.
 * Retries: the last result counts.
 */
export default class CucumberReporter implements Reporter {
  private readonly runs = new Map<string, TestRun>()

  printsToStdio(): boolean {
    return false
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.runs.set(test.id, toTestRun(test, result))
  }

  onEnd(): void {
    if (this.runs.size === 0) return
    const outputFile = CONFIG.paths.cucumberReport
    try {
      const report = buildCucumberReport([...this.runs.values()], createSpecFinder())
      fs.mkdirSync(path.dirname(outputFile), { recursive: true })
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2))
    } catch (error: unknown) {
      console.error(`Cucumber report not written to ${outputFile}: ${getErrorMessage(error)}`)
    }
  }
}

function toTestRun(test: TestCase, result: TestResult): TestRun {
  const failed = result.status !== 'passed' && result.status !== 'skipped'
  return {
    file: toProjectPath(test.location.file),
    title: test.title,
    line: test.location.line,
    tags: test.tags,
    status: result.status,
    durationMs: result.duration,
    error: result.error?.message?.replace(ANSI, ''),
    steps: result.steps.map(toRunStep),
    screenshots: failed
      ? result.attachments.flatMap((attachment) =>
          attachment.contentType.startsWith('image/') && attachment.path
            ? [
                {
                  mimeType: attachment.contentType,
                  base64: fs.readFileSync(attachment.path).toString('base64')
                }
              ]
            : []
        )
      : []
  }
}

function toRunStep(step: TestStep): RunStep {
  return {
    title: step.title,
    category: step.category,
    durationMs: step.duration,
    error: step.error?.message?.replace(ANSI, ''),
    steps: step.steps.map(toRunStep)
  }
}

/** Spec of a test file by base name (`auth.ui.test.ts` → `test-suites/auth.md`), parsed once */
function createSpecFinder(): (testFile: string) => RunSpec | null {
  const specPaths = new Map(
    glob
      .sync(`${CONFIG.paths.testSuites}/${SPEC_FILE_GLOB}`)
      .map((specPath) => [getMarkdownBaseName(specPath), toProjectPath(specPath)])
  )
  const cache = new Map<string, RunSpec | null>()
  return (testFile) => {
    const specPath = specPaths.get(getTestFileBaseName(path.basename(testFile)))
    if (!specPath) return null
    if (!cache.has(specPath)) {
      try {
        const language = specPath.endsWith('.feature')
          ? (parseGherkinDocument(specPath).feature?.language ?? 'en')
          : null
        cache.set(specPath, { path: specPath, parsed: parseMDFile(specPath), language })
      } catch {
        cache.set(specPath, null) // invalid spec - dress reports it, the test keeps its own feature
      }
    }
    return cache.get(specPath) ?? null
  }
}

function toProjectPath(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/')
}
