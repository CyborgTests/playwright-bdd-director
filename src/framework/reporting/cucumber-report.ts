import { dialects } from '@cucumber/gherkin'

import { splitStepKeyword } from '../bdd/runtime'
import type { ParsedMD } from '../core/md-parser'
import {
  fillPlaceholders,
  findExampleRow,
  isBackgroundTitle,
  matchesSpecCase,
  parseIDAndTitle
} from '../utils/helpers'

/** Step of a finished test as Playwright reports it (test.step, hook, ...) */
export interface RunStep {
  title: string
  category: string // 'test.step' | 'hook' | 'fixture' | 'pw:api' | 'expect' | ...
  durationMs: number
  error?: string
  skipped?: boolean // skipped from inside (step skip annotation)
  attachments?: Attachment[] // attached to the step (AfterStep screenshot, ...)
  steps: RunStep[]
}

export interface Attachment {
  mimeType: string
  base64: string
}

/** Last result of a test, independent of the Playwright reporter API */
export interface TestRun {
  file: string // test file, `/`-separated, relative to the project root
  title: string // test title as run: examples values filled in
  line: number
  tags: string[]
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
  startTime?: string // ISO
  durationMs: number
  error?: string
  steps: RunStep[]
  screenshots: Attachment[] // evidence of a failed test
  expectedToFail?: string // tag of a known bug (@fail, @fail:tablet) - the test must fail
  project?: string // Playwright project - the device the test ran on
}

/** Spec a test file belongs to (same base name) */
export interface RunSpec {
  path: string // `/`-separated, relative to the project root
  parsed: ParsedMD
  language: string | null // Gherkin dialect; null for Markdown
}

type Status = 'passed' | 'failed' | 'skipped'

export interface CucumberResult {
  status: Status
  duration: number // nanoseconds
  error_message?: string
}

export interface CucumberStep {
  keyword: string // with trailing space, as Cucumber writes it: "Given "
  name: string
  line: number
  result: CucumberResult
  embeddings?: Array<{ mime_type: string; data: string }>
}

export interface CucumberHook {
  match: { location: string }
  result: CucumberResult
}

export interface CucumberElement {
  id: string
  keyword: string
  name: string
  description: string
  line: number
  type: 'background' | 'scenario'
  start_timestamp?: string // scenario start (ISO), as Cucumber-JVM writes it
  tags?: Array<{ name: string; line: number }>
  before?: CucumberHook[]
  after?: CucumberHook[]
  steps: CucumberStep[]
}

export interface CucumberFeature {
  uri: string
  id: string
  keyword: string
  name: string
  description: string
  line: number
  tags: Array<{ name: string; line: number }>
  elements: CucumberElement[]
  device?: string // report of several devices (HTML) only - Cucumber JSON has no such field
}

const MANUAL_PREFIX = /^✋ \[MANUAL\] /
/** Keyword of Markdown steps - Gherkin's neutral "*" */
const NEUTRAL_KEYWORD = '* '

/**
 * Cucumber JSON (the format test management tools import: Xray, Zephyr, ...) of finished tests.
 * Structure comes from the spec - Feature, Background, Scenario (Outline), steps with keywords, tags;
 * results from the run - each spec step gets the result of the test.step with its title
 * (manual steps of cyborg tests included). Tests without a spec become features of their files.
 * @param findSpec - spec of a test file, null when there is none
 * @param devices - a feature per spec and device (Playwright project): one report of a run on
 * several devices, for people
 */
export function buildCucumberReport(
  runs: TestRun[],
  findSpec: (testFile: string) => RunSpec | null,
  { devices = false }: { devices?: boolean } = {}
): CucumberFeature[] {
  const features = new Map<string, CucumberFeature>()
  const device = (run: TestRun) => (devices ? (run.project ?? '') : '')
  const sorted = [...runs].sort(
    (a, b) => a.file.localeCompare(b.file) || device(a).localeCompare(device(b)) || a.line - b.line
  )

  for (const run of sorted) {
    const spec = findSpec(run.file)
    const uri = spec?.path ?? run.file
    const key = `${uri}
${device(run)}`
    let feature = features.get(key)
    if (!feature) {
      feature = {
        ...buildFeature(uri, spec, run),
        ...(device(run) ? { device: device(run) } : {})
      }
      features.set(key, feature)
    }
    feature.elements.push(...buildElements(run, spec, feature.id))
  }
  return [...features.values()]
}

function buildFeature(uri: string, spec: RunSpec | null, run: TestRun): CucumberFeature {
  const name = spec?.parsed.suiteTtl ?? run.file
  return {
    uri,
    id: slug(name),
    keyword: keywords(spec).feature,
    name,
    description: '',
    line: 1,
    tags: (spec?.parsed.suiteTags ?? []).map((tag) => ({ name: tag, line: 1 })),
    elements: []
  }
}

function buildElements(run: TestRun, spec: RunSpec | null, featureId: string): CucumberElement[] {
  const testCase = spec?.parsed.testCases.find(
    (tc) => !isBackgroundTitle(tc.ttl) && matchesSpecCase(tc, parseIDAndTitle(run.title))
  )
  const background = spec?.parsed.testCases.find((tc) => isBackgroundTitle(tc.ttl))
  const words = keywords(spec)

  const beforeHooks = childrenOf(run.steps, 'Before Hooks')
  const backgroundRun = background
    ? stepsOf(beforeHooks.find((hook) => hook.title === background.ttl))
    : []
  // Rule Backgrounds run as their own hooks; in the spec model their steps lead the scenario
  const ruleBackgroundRun = beforeHooks
    .filter((hook) => isBackgroundTitle(hook.title) && hook.title !== background?.ttl)
    .flatMap(stepsOf)
  const scenarioRun = [...ruleBackgroundRun, ...run.steps.filter(isTestStep)]

  const values = testCase ? (findExampleRow(testCase, run.title) ?? {}) : {}
  const expected = testCase?.stepTtls.map((title) => fillPlaceholders(title, values))

  const backgroundSteps = background
    ? matchSteps(background.stepTtls, backgroundRun, spec, run.status)
    : []
  const steps = matchSteps(
    expected ?? scenarioRun.map((step) => step.title),
    scenarioRun,
    spec,
    run.status
  )
  // beforeEach "BeforeStep: …" / "AfterStep: …" only registers a step hook - it runs inside steps
  const before = beforeHooks
    .filter((hook) => !isBackgroundTitle(hook.title) && !/^(Before|After)Step: /.test(hook.title))
    .map(toHook)
  const after = childrenOf(run.steps, 'After Hooks').map(toHook)
  attributeFailure(run, [...backgroundSteps, ...steps], after)
  if (run.expectedToFail) markKnownBug(run.expectedToFail, [...backgroundSteps, ...steps], after)

  const elements: CucumberElement[] = []
  if (background) {
    elements.push({
      id: `${featureId};${slug(background.ttl)}`,
      keyword: words.background,
      name: background.ttl.replace(/^Background:?\s*/, ''),
      description: '',
      line: 0,
      type: 'background',
      steps: backgroundSteps
    })
  }
  elements.push({
    id: `${featureId};${slug(run.title)}`,
    keyword: testCase?.examples ? words.scenarioOutline : words.scenario,
    name: run.title,
    description: '',
    line: run.line,
    type: 'scenario',
    ...(run.startTime ? { start_timestamp: run.startTime } : {}),
    tags: [...new Set(run.tags)].map((tag) => ({ name: tag, line: run.line })),
    ...(before.length > 0 ? { before } : {}),
    ...(after.length > 0 ? { after } : {}),
    steps
  })
  return elements
}

/**
 * Spec step titles with the result of the next test.step of the same title (in order);
 * a step that did not run is skipped
 */
function matchSteps(
  titles: string[],
  executed: RunStep[],
  spec: RunSpec | null,
  testStatus: TestRun['status']
): CucumberStep[] {
  let next = 0
  return titles.map((title, i) => {
    const index = executed.findIndex(
      (step, j) => j >= next && step.title.replace(MANUAL_PREFIX, '') === title
    )
    const step = index >= 0 ? executed[index] : undefined
    if (step) next = index + 1
    const status: Status =
      step && testStatus !== 'skipped' && !step.skipped
        ? step.error
          ? 'failed'
          : 'passed'
        : 'skipped'
    return {
      ...splitKeyword(title, spec),
      line: i + 1,
      result: {
        status,
        duration: toNanoseconds(step?.durationMs ?? 0),
        ...(step?.error ? { error_message: step.error } : {})
      },
      ...(step?.attachments?.length ? { embeddings: step.attachments.map(toEmbedding) } : {})
    }
  })
}

/**
 * A known bug stays failed - test management shows the product as it is - with the tag in the
 * message; a test that passes despite it fails, as in Playwright: the bug looks fixed
 */
function markKnownBug(tag: string, steps: CucumberStep[], after: CucumberHook[]): void {
  const failed = [...steps, ...after].find((step) => step.result.status === 'failed')
  if (failed) {
    failed.result.error_message = `Expected to fail (${tag}): a known bug\n${failed.result.error_message ?? ''}`
    return
  }
  after.push({
    match: { location: 'Test' },
    result: {
      status: 'failed',
      duration: 0,
      error_message: `Passed, but tagged ${tag}: the bug looks fixed - drop the tag`
    }
  })
}

/**
 * A failed test must show a failed step: an error outside steps (fixture, timeout) goes to the
 * first step that did not run, else to an after hook; screenshots go to the failed step
 */
function attributeFailure(run: TestRun, steps: CucumberStep[], after: CucumberHook[]): void {
  if (run.status === 'passed' || run.status === 'skipped') return
  let failed = steps.find((step) => step.result.status === 'failed')
  if (!failed && !after.some((hook) => hook.result.status === 'failed')) {
    failed = steps.find((step) => step.result.status === 'skipped')
    const result: CucumberResult = {
      status: 'failed',
      duration: 0,
      error_message: run.error ?? `Test ${run.status}`
    }
    if (failed) failed.result = result
    else after.push({ match: { location: 'Test' }, result })
  }
  if (failed && run.screenshots.length > 0) {
    failed.embeddings = [...(failed.embeddings ?? []), ...run.screenshots.map(toEmbedding)]
  }
}

function toEmbedding({ mimeType, base64 }: Attachment): { mime_type: string; data: string } {
  return { mime_type: mimeType, data: base64 }
}

function splitKeyword(title: string, spec: RunSpec | null): { keyword: string; name: string } {
  const split = spec?.language
    ? splitStepKeyword(title, spec.language)
    : spec
      ? null // Markdown steps have no keyword
      : splitStepKeyword(title)
  return split
    ? { keyword: `${split.keyword} `, name: split.text }
    : { keyword: NEUTRAL_KEYWORD, name: title }
}

function toHook(hook: RunStep): CucumberHook {
  return {
    match: { location: hook.title },
    result: {
      status: hook.error ? 'failed' : 'passed',
      duration: toNanoseconds(hook.durationMs),
      ...(hook.error ? { error_message: hook.error } : {})
    }
  }
}

/** Hook steps inside the "Before Hooks" / "After Hooks" group of a test */
function childrenOf(steps: RunStep[], group: string): RunStep[] {
  return (
    steps.find((step) => step.category === 'hook' && step.title === group)?.steps ?? []
  ).filter((step) => step.category === 'hook')
}

function stepsOf(hook: RunStep | undefined): RunStep[] {
  return hook?.steps.filter(isTestStep) ?? []
}

function isTestStep(step: RunStep): boolean {
  return step.category === 'test.step'
}

/** Gherkin keywords of the spec language (English for Markdown and unknown specs) */
function keywords(
  spec: RunSpec | null
): Record<'feature' | 'background' | 'scenario' | 'scenarioOutline', string> {
  const dialect = dialects[spec?.language ?? 'en'] ?? dialects.en
  return {
    feature: dialect.feature[0],
    background: dialect.background[0],
    scenario: dialect.scenario.at(-1)!, // "Scenario" ("Example" is listed first)
    scenarioOutline: dialect.scenarioOutline[0]
  }
}

function toNanoseconds(ms: number): number {
  return Math.round(ms * 1_000_000)
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}
