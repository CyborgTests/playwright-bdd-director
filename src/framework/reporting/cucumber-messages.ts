import { generateMessages } from '@cucumber/gherkin'
import {
  AttachmentContentEncoding,
  type Envelope,
  type Hook,
  HookType,
  IdGenerator,
  type Pickle,
  SourceMediaType,
  type TestStep,
  TestStepResultStatus,
  TimeConversion,
  version
} from '@cucumber/messages'
import os from 'os'

import type {
  CucumberElement,
  CucumberFeature,
  CucumberHook,
  CucumberStep
} from './cucumber-report'

export interface MessagesOptions {
  /** Source text of a Gherkin spec (`.feature` uri), null when it cannot be read */
  readSource: (uri: string) => string | null
  newId?: IdGenerator.NewId
  now?: Date // run start when no scenario has a start time
}

/** Scenario run: its background steps first, as a pickle lists them */
interface ScenarioRun {
  element: CucumberElement
  steps: CucumberStep[]
}

const STATUS: Record<CucumberStep['result']['status'], TestStepResultStatus> = {
  passed: TestStepResultStatus.PASSED,
  failed: TestStepResultStatus.FAILED,
  skipped: TestStepResultStatus.SKIPPED
}

/**
 * Cucumber messages (NDJSON envelopes - the format of Cucumber HTML reports and newer tools) of
 * a Cucumber JSON report. A Gherkin spec keeps its own source (Rules, tables, language); other
 * features get Gherkin written from the report. Each scenario element is one test case run of
 * the pickle with its name (in order for written sources), its steps in the pickle order.
 */
export function buildCucumberMessages(
  features: CucumberFeature[],
  { readSource, newId = IdGenerator.uuid(), now = new Date() }: MessagesOptions
): Envelope[] {
  const testRunStartedId = newId()
  const sources: Envelope[] = []
  const hooks = new Map<string, Hook>()
  const results: Envelope[] = []
  let first = Infinity
  let last = -Infinity

  for (const feature of features) {
    const original = feature.uri.endsWith('.feature') ? readSource(feature.uri) : null
    const envelopes = generateMessages(
      original ?? toGherkin(feature),
      // A run on several devices: a section per device, the spec source in each
      feature.device ? `${feature.device}/${feature.uri}` : feature.uri,
      SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
      { includeSource: true, includeGherkinDocument: true, includePickles: true, newId }
    )
    sources.push(...envelopes)
    const pickles = envelopes.flatMap((envelope) => (envelope.pickle ? [envelope.pickle] : []))
    const used = new Set<Pickle>()

    toScenarioRuns(feature).forEach((run, index) => {
      const pickle = original
        ? (pickles.find((p) => p.name === run.element.name && !used.has(p)) ??
          pickles.find((p) => p.name === run.element.name))
        : pickles[index]
      if (!pickle) return
      used.add(pickle)

      const start = Date.parse(run.element.start_timestamp ?? '') || now.getTime()
      const end = emitTestCase(pickle, run, start, { testRunStartedId, hooks, newId, results })
      first = Math.min(first, start)
      last = Math.max(last, end)
    })
  }

  const startedAt = Number.isFinite(first) ? first : now.getTime()
  const finishedAt = Number.isFinite(last) ? last : startedAt
  const success = !results.some(
    (envelope) => envelope.testStepFinished?.testStepResult.status === TestStepResultStatus.FAILED
  )
  return [
    { meta: meta() },
    ...sources,
    ...[...hooks.values()].map((hook) => ({ hook })),
    { testRunStarted: { id: testRunStartedId, timestamp: toTimestamp(startedAt) } },
    ...results,
    {
      testRunFinished: { testRunStartedId, success, timestamp: toTimestamp(finishedAt) }
    }
  ]
}

/**
 * Test case with hooks and steps, started / finished in sequence from `start`
 * @returns end time (ms)
 */
function emitTestCase(
  pickle: Pickle,
  run: ScenarioRun,
  start: number,
  context: {
    testRunStartedId: string
    hooks: Map<string, Hook>
    newId: IdGenerator.NewId
    results: Envelope[]
  }
): number {
  const { newId, results } = context
  type Planned = {
    testStep: TestStep
    result: CucumberStep['result']
    embeddings: CucumberStep['embeddings']
  }
  const hookStep = (hook: CucumberHook, type: HookType): Planned => ({
    testStep: { id: newId(), hookId: hookOf(hook.match.location, type, context).id },
    result: hook.result,
    embeddings: undefined
  })
  const planned: Planned[] = [
    ...(run.element.before ?? []).map((hook) => hookStep(hook, HookType.BEFORE_TEST_CASE)),
    ...pickle.steps.map((pickleStep, i) => ({
      testStep: {
        id: newId(),
        pickleStepId: pickleStep.id,
        stepDefinitionIds: [],
        stepMatchArgumentsLists: []
      },
      result: run.steps[i]?.result ?? { status: 'skipped' as const, duration: 0 },
      embeddings: run.steps[i]?.embeddings
    })),
    ...(run.element.after ?? []).map((hook) => hookStep(hook, HookType.AFTER_TEST_CASE))
  ]

  const testCaseId = newId()
  const testCaseStartedId = newId()
  results.push({
    testCase: {
      id: testCaseId,
      pickleId: pickle.id,
      testSteps: planned.map(({ testStep }) => testStep),
      testRunStartedId: context.testRunStartedId
    }
  })
  results.push({
    testCaseStarted: {
      id: testCaseStartedId,
      testCaseId,
      attempt: 0,
      timestamp: toTimestamp(start)
    }
  })

  let time = start
  for (const { testStep, result, embeddings } of planned) {
    const testStepId = testStep.id
    results.push({
      testStepStarted: { testCaseStartedId, testStepId, timestamp: toTimestamp(time) }
    })
    for (const embedding of embeddings ?? []) {
      results.push({
        attachment: {
          body: embedding.data,
          contentEncoding: AttachmentContentEncoding.BASE64,
          mediaType: embedding.mime_type,
          testCaseStartedId,
          testStepId
        }
      })
    }
    const durationMs = result.duration / 1e6
    time += durationMs
    results.push({
      testStepFinished: {
        testCaseStartedId,
        testStepId,
        testStepResult: {
          status: STATUS[result.status],
          duration: TimeConversion.millisecondsToDuration(durationMs),
          ...(result.error_message ? { message: result.error_message } : {})
        },
        timestamp: toTimestamp(time)
      }
    })
  }
  results.push({
    testCaseFinished: { testCaseStartedId, timestamp: toTimestamp(time), willBeRetried: false }
  })
  return time
}

/** One hook message per title and type */
function hookOf(
  name: string,
  type: HookType,
  { hooks, newId }: { hooks: Map<string, Hook>; newId: IdGenerator.NewId }
): Hook {
  const key = `${type}:${name}`
  let hook = hooks.get(key)
  if (!hook) {
    hook = { id: newId(), name, type, sourceReference: {} }
    hooks.set(key, hook)
  }
  return hook
}

/** Scenario elements with the steps of the background elements right before them */
function toScenarioRuns(feature: CucumberFeature): ScenarioRun[] {
  const runs: ScenarioRun[] = []
  let background: CucumberStep[] = []
  for (const element of feature.elements) {
    if (element.type === 'background') {
      background = element.steps
      continue
    }
    runs.push({ element, steps: [...background, ...element.steps] })
    background = []
  }
  return runs
}

/**
 * Gherkin of a feature without Gherkin spec (Markdown spec, test without spec): a scenario per
 * element run, background steps inlined - the pickles then follow the elements in order
 */
function toGherkin(feature: CucumberFeature): string {
  const lines = [
    ...tagLine(feature.tags, ''),
    `Feature: ${oneLine(feature.name)}`,
    ...toScenarioRuns(feature).flatMap(({ element, steps }) => [
      '',
      ...tagLine(element.tags ?? [], '  '),
      `  Scenario: ${oneLine(element.name)}`,
      ...steps.map((step) => `    ${step.keyword.trim() || '*'} ${oneLine(step.name)}`)
    ])
  ]
  return `${lines.join('\n')}\n`
}

function tagLine(tags: Array<{ name: string }>, indent: string): string[] {
  const names = [...new Set(tags.map((tag) => tag.name.replace(/\s+/g, '_')))]
  return names.length > 0 ? [`${indent}${names.join(' ')}`] : []
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ')
}

function toTimestamp(ms: number) {
  return TimeConversion.millisecondsSinceEpochToTimestamp(ms)
}

function meta(): Envelope['meta'] {
  return {
    protocolVersion: version,
    implementation: { name: 'playwright-bdd-director' },
    runtime: { name: 'node.js', version: process.versions.node },
    os: { name: os.platform(), version: os.release() },
    cpu: { name: os.arch() }
  }
}
