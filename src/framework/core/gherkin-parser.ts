import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import {
  type Background,
  type Examples,
  type FeatureChild,
  IdGenerator,
  type RuleChild,
  type Step,
  type Tag
} from '@cucumber/messages'
import fs from 'fs'

import { BACKGROUND_TTL } from '../constants/markdown'
import { buildExamplesError, buildMissingElementError } from '../errors/error-builders'
import {
  assertUniqueTestCaseIds,
  assertValidExamples,
  assertValidTags,
  getBddSpecKey,
  getErrorMessage,
  isBackgroundTitle,
  parseIDAndTitle
} from '../utils/helpers'
import type { ExamplesTable, ParsedMD, TestCase } from './md-parser'

/**
 * Parse Gherkin spec (`.feature`) into the same structure as Markdown, so validation, generation
 * and auto-fixing work unchanged:
 * - Feature → suite, Scenario / Scenario Outline / Example → test case, step → step;
 *   Outline Examples (several blocks with same columns are joined) → examples table
 * - step title keeps its keyword as written: "Given user is on login page", "And ..."
 * - Background → test case "Background" (or "Background: name"), implemented by a named
 *   test.beforeEach (see isBackgroundTitle)
 * - Rule groups its scenarios only (flattened in source order)
 * - step definitions style specs (CONFIG.bdd.dirs) also allow Background inside Rule and tags on
 *   Examples (added to the test case tags) - their tests are generated, not written by hand
 * - tags: Feature → suite tags, Rule + Scenario → test case tags (Background has none)
 * - descriptions, data tables and doc strings are details, ignored like MD bullet lines
 * - `[ID]` in Feature / Scenario names follows the MD convention
 */
export function parseGherkinFile(
  featurePath: string,
  { isBdd = getBddSpecKey(featurePath) !== null }: { isBdd?: boolean } = {}
): ParsedMD {
  const feature = parseGherkinDocument(featurePath).feature

  if (!feature) {
    throw new Error(
      buildMissingElementError(
        'test suite title',
        featurePath,
        'File must contain "Feature: Title"'
      )
    )
  }

  const suite = parseIDAndTitle(feature.name.trim())
  const testCases = feature.children.flatMap((child) => toTestCases(child, featurePath, [], isBdd))

  if (testCases.every((tc) => isBackgroundTitle(tc.ttl))) {
    throw new Error(
      buildMissingElementError('test cases', featurePath, 'At least one "Scenario: Title"')
    )
  }

  assertUniqueTestCaseIds(testCases, featurePath)
  testCases.forEach((tc) => assertValidExamples(tc, featurePath))

  const suiteTags = toTagNames(feature.tags)
  assertValidTags([...suiteTags, ...testCases.flatMap((tc) => tc.tags)], featurePath)

  return { suiteID: suite.id ?? '', suiteTtl: suite.ttl, suiteTags, testCases }
}

export function parseGherkinDocument(featurePath: string) {
  const parser = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher()
  )
  try {
    return parser.parse(fs.readFileSync(featurePath, 'utf-8'))
  } catch (error: unknown) {
    // Parser message already lists every problem as "(line:column): ..."
    throw new Error(`Invalid Gherkin in ${featurePath}\n${getErrorMessage(error)}`, {
      cause: error
    })
  }
}

function toTestCases(
  child: FeatureChild | RuleChild,
  featurePath: string,
  ruleTags: string[],
  isBdd: boolean,
  ruleSteps: string[] = []
): TestCase[] {
  if (child.background) return [toBackgroundCase(child.background)]

  if (child.scenario) {
    const { id, ttl } = parseIDAndTitle(child.scenario.name.trim())
    const examplesTags = isBdd
      ? child.scenario.examples.flatMap((block) => toTagNames(block.tags))
      : []
    const tags = [...new Set([...ruleTags, ...toTagNames(child.scenario.tags), ...examplesTags])]
    const examples = toExamplesTable(child.scenario.examples, ttl, featurePath, isBdd)
    const stepTtls = [...ruleSteps, ...child.scenario.steps.map(toStepTtl)]
    return [{ id, ttl, stepTtls, tags, examples }]
  }

  if ('rule' in child && child.rule) {
    const { rule } = child
    const background = rule.children.find((ruleChild) => ruleChild.background)?.background
    if (!isBdd && background) {
      throw new Error(
        `Background inside Rule is not supported yet: "${rule.name}" in ${featurePath}\n` +
          `  Fix: Move the Background to Feature level (supported in step definitions style specs)`
      )
    }
    // Rule Background steps run before each scenario of the Rule only: in the case model (cyborg
    // tests, matrix) they lead its scenarios' steps - a beforeEach would also run for other tests
    const steps = background?.steps.map(toStepTtl) ?? []
    const tags = toTagNames(rule.tags)
    return rule.children
      .filter((ruleChild) => !ruleChild.background)
      .flatMap((ruleChild) => toTestCases(ruleChild, featurePath, tags, isBdd, steps))
  }

  return []
}

function toBackgroundCase(background: Background): TestCase {
  return {
    id: null,
    ttl: getBackgroundTitle(background),
    stepTtls: background.steps.map(toStepTtl),
    tags: [],
    examples: null
  }
}

/**
 * "Background" or "Background: <name>"; a Background inside Rule without name is titled by its
 * Rule ("Background: <rule>") so the two stay apart
 */
export function getBackgroundTitle(background: Background, ruleName?: string): string {
  const name = background.name.trim() || ruleName
  return name ? `${BACKGROUND_TTL}: ${name}` : BACKGROUND_TTL
}

/**
 * Outline Examples blocks joined into one table. Tags on Examples would need per-row tags in
 * hand-written tests - allowed only in step definitions style specs (isBdd), whose tests are
 * generated.
 */
function toExamplesTable(
  blocks: readonly Examples[],
  caseTtl: string,
  featurePath: string,
  isBdd: boolean
): ExamplesTable | null {
  const withHeader = blocks.filter((block) => block.tableHeader)
  if (withHeader.length === 0) return null

  const fail = (problem: string, fix: string): never => {
    throw new Error(buildExamplesError(problem, caseTtl, featurePath, fix))
  }
  if (!isBdd && withHeader.some((block) => block.tags.length > 0)) {
    fail(
      'have tags - not supported yet',
      'Move the tags to the Scenario Outline (Examples tags work in step definitions style specs)'
    )
  }

  const cells = (row: { cells: readonly { value: string }[] }) => row.cells.map((c) => c.value)
  const columns = cells(withHeader[0].tableHeader!)
  if (withHeader.some((block) => cells(block.tableHeader!).join('\n') !== columns.join('\n'))) {
    fail('blocks have different columns', 'Use the same columns in every Examples block')
  }
  return { columns, rows: withHeader.flatMap((block) => block.tableBody.map(cells)) }
}

function toTagNames(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.name)
}

function toStepTtl(step: Step): string {
  return `${step.keyword.trim()} ${step.text.trim()}`
}
