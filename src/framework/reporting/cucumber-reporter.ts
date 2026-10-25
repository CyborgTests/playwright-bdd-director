/* eslint-disable no-console -- Playwright reporter: a failed report is printed, never thrown */
import { CucumberHtmlStream } from '@cucumber/html-formatter'
import type { Envelope } from '@cucumber/messages'
import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter'
import fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import { finished } from 'stream/promises'

import { CONFIG } from '../config'
import { SPEC_FILE_GLOB } from '../constants/markdown'
import { parseGherkinDocument } from '../core/gherkin-parser'
import { parseMDFile } from '../core/md-parser'
import {
  getErrorMessage,
  getMarkdownBaseName,
  getTestFileBaseName,
  toProjectPath
} from '../utils/helpers'
import { buildCucumberMessages } from './cucumber-messages'
import { buildCucumberReport, type RunSpec, type RunStep, type TestRun } from './cucumber-report'

const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g')

/**
 * Cucumber reports of every run in CONFIG.paths.cucumberReports: JSON and messages (NDJSON) per
 * Playwright project - a test management tool imports each as a run on that device - and one
 * HTML of all projects for people, the device in every scenario name. Each test is reported with
 * the structure of its spec (Markdown or Gherkin), see buildCucumberReport. Retries: the last
 * result counts.
 */
export default class CucumberReporter implements Reporter {
  private readonly runs = new Map<string, TestRun>()

  printsToStdio(): boolean {
    return false
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.runs.set(test.id, toTestRun(test, result))
  }

  async onEnd(): Promise<void> {
    if (this.runs.size === 0) return
    const dir = CONFIG.paths.cucumberReports
    try {
      // Reports of an earlier run on other devices would pass for this run's. The folder itself
      // stays: on Windows it cannot be removed while a terminal or a server has it open
      for (const entry of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
        fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
      }
      const runs = [...this.runs.values()]
      const findSpec = createSpecFinder()
      for (const project of new Set(runs.map((run) => run.project ?? ''))) {
        const report = buildCucumberReport(
          runs.filter((run) => (run.project ?? '') === project),
          findSpec
        )
        writeFile(path.join(dir, project, 'cucumber-report.json'), JSON.stringify(report, null, 2))
        writeFile(
          path.join(dir, project, 'cucumber-messages.ndjson'),
          buildCucumberMessages(report, { readSource: readText })
            .map((envelope) => `${JSON.stringify(envelope)}\n`)
            .join('')
        )
      }
      const all = buildCucumberReport(runs, findSpec, { devices: true })
      await writeHtml(
        buildCucumberMessages(all, { readSource: readText }),
        path.join(dir, 'cucumber-report.html')
      )
    } catch (error: unknown) {
      console.error(`Cucumber reports not written: ${getErrorMessage(error)}`)
    }
  }
}

function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

function readText(file: string): string | null {
  return readFile(file)?.toString('utf-8') ?? null
}

async function writeHtml(envelopes: Envelope[], file: string): Promise<void> {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const html = new CucumberHtmlStream()
  const output = fs.createWriteStream(file)
  html.pipe(output)
  for (const envelope of envelopes) html.write(envelope)
  html.end()
  await finished(output)
}

function toTestRun(test: TestCase, result: TestResult): TestRun {
  const failed = result.status !== 'passed' && result.status !== 'skipped'
  return {
    file: toProjectPath(test.location.file),
    project: test.parent.project()?.name,
    title: test.title,
    line: test.location.line,
    tags: test.tags,
    status: result.status,
    startTime: result.startTime.toISOString(),
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
      : [],
    ...(test.expectedStatus === 'failed' ? { expectedToFail: knownBugTag(test, result) } : {})
  }
}

/**
 * `@fail:tablet` from the annotation the generated test sets (a conditional one lands on the
 * result), `@fail` for a plain test.fail
 */
function knownBugTag(test: TestCase, result: TestResult): string {
  return (
    [...result.annotations, ...test.annotations].find((annotation) => annotation.type === 'fail')
      ?.description ?? '@fail'
  )
}

function toRunStep(step: TestStep): RunStep {
  const attachments = step.attachments.flatMap((attachment) => {
    const content = attachment.body ?? (attachment.path ? readFile(attachment.path) : undefined)
    return content ? [{ mimeType: attachment.contentType, base64: content.toString('base64') }] : []
  })
  return {
    title: step.title,
    category: step.category,
    durationMs: step.duration,
    error: step.error?.message?.replace(ANSI, ''),
    ...(step.annotations.some((annotation) => annotation.type === 'skip') ? { skipped: true } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    steps: step.steps.map(toRunStep)
  }
}

/** Attachment file, undefined when it is gone (output folder cleaned) */
function readFile(file: string): Buffer | undefined {
  try {
    return fs.readFileSync(file)
  } catch {
    return undefined
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
