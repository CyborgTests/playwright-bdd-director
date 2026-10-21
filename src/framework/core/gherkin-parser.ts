import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import {
  type Background,
  type FeatureChild,
  IdGenerator,
  type Step,
  type Tag
} from '@cucumber/messages'
import fs from 'fs'

import { BACKGROUND_TTL } from '../constants/markdown'
import { buildMissingElementError } from '../errors/error-builders'
import {
  assertUniqueTestCaseIds,
  assertValidTags,
  getErrorMessage,
  isBackgroundTitle,
  parseIDAndTitle
} from '../utils/helpers'
import type { ParsedMD, TestCase } from './md-parser'

/**
 * Parse Gherkin spec (`.feature`) into the same structure as Markdown, so validation, generation
 * and auto-fixing work unchanged:
 * - Feature → suite, Scenario / Scenario Outline / Example → test case, step → step
 * - step title keeps its keyword as written: "Given user is on login page", "And ..."
 * - Background → test case "Background" (or "Background: name"), implemented by a named
 *   test.beforeEach (see isBackgroundTitle)
 * - Rule groups its scenarios only (flattened in source order)
 * - tags: Feature → suite tags, Rule + Scenario → test case tags (Background has none)
 * - descriptions, data tables and doc strings are details, ignored like MD bullet lines
 * - `[ID]` in Feature / Scenario names follows the MD convention
 */
export function parseGherkinFile(featurePath: string): ParsedMD {
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
  const testCases = feature.children.flatMap((child) => toTestCases(child, featurePath, []))

  if (testCases.every((tc) => isBackgroundTitle(tc.ttl))) {
    throw new Error(
      buildMissingElementError('test cases', featurePath, 'At least one "Scenario: Title"')
    )
  }

  assertUniqueTestCaseIds(testCases, featurePath)

  const suiteTags = toTagNames(feature.tags)
  assertValidTags([...suiteTags, ...testCases.flatMap((tc) => tc.tags)], featurePath)

  return { suiteID: suite.id ?? '', suiteTtl: suite.ttl, suiteTags, testCases }
}

function parseGherkinDocument(featurePath: string) {
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

function toTestCases(child: FeatureChild, featurePath: string, ruleTags: string[]): TestCase[] {
  if (child.background) return [toBackgroundCase(child.background)]

  if (child.scenario) {
    const { id, ttl } = parseIDAndTitle(child.scenario.name.trim())
    const tags = [...new Set([...ruleTags, ...toTagNames(child.scenario.tags)])]
    return [{ id, ttl, stepTtls: child.scenario.steps.map(toStepTtl), tags }]
  }

  if (child.rule) {
    if (child.rule.children.some((ruleChild) => ruleChild.background)) {
      throw new Error(
        `Background inside Rule is not supported yet: "${child.rule.name}" in ${featurePath}\n` +
          `  Fix: Move the Background to Feature level`
      )
    }
    const tags = toTagNames(child.rule.tags)
    return child.rule.children.flatMap((ruleChild) => toTestCases(ruleChild, featurePath, tags))
  }

  return []
}

function toBackgroundCase(background: Background): TestCase {
  const name = background.name.trim()
  return {
    id: null,
    ttl: name ? `${BACKGROUND_TTL}: ${name}` : BACKGROUND_TTL,
    stepTtls: background.steps.map(toStepTtl),
    tags: []
  }
}

function toTagNames(tags: readonly Tag[]): string[] {
  return tags.map((tag) => tag.name)
}

function toStepTtl(step: Step): string {
  return `${step.keyword.trim()} ${step.text.trim()}`
}
