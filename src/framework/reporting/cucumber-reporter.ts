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
import { getErrorMessage, getMarkdownBaseName, getTestFileBaseName } from '../utils/helpers'
import { buildCucumberMessages } from './cucumber-messages'
import { buildCucumberReport, type RunSpec, type RunStep, type TestRun } from './cucumber-report'

const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g')

/**
 * Cucumber reports of every run: JSON for test management tools (CONFIG.paths.cucumberReport),
 * messages (NDJSON, cucumberMessages) and HTML rendered from them (cucumberHtml). Each test is
 * reported with the structure of its spec (Markdown or Gherkin), see buildCucumberReport.
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

  async onEnd(): Promise<void> {
    if (this.runs.size === 0) return
    const { cucumberReport, cucumberMessages, cucumberHtml } = CONFIG.paths
    try {
      const report = buildCucumberReport([...this.runs.values()], createSpecFinder())
      writeFile(cucumberReport, JSON.stringify(report, null, 2))
      const envelopes = buildCucumberMessages(report, { readSource: readText })
      writeFile(
        cucumberMessages,
        envelopes.map((envelope) => `${JSON.stringify(envelope)}\n`).join('')
      )
      await writeHtml(envelopes, cucumberHtml)
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
      : []
  }
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

function toProjectPath(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/')
}
