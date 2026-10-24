import { type Envelope, IdGenerator } from '@cucumber/messages'
import { describe, expect, it } from 'vitest'

import { buildCucumberMessages } from '@/framework/reporting/cucumber-messages'
import type {
  CucumberElement,
  CucumberFeature,
  CucumberStep
} from '@/framework/reporting/cucumber-report'

const step = (
  keyword: string,
  name: string,
  status: CucumberStep['result']['status'] = 'passed',
  extra: Partial<CucumberStep> = {}
): CucumberStep => ({
  keyword,
  name,
  line: 1,
  result: { status, duration: 2_000_000 },
  ...extra
})
const element = (extra: Partial<CucumberElement>): CucumberElement => ({
  id: 'x',
  keyword: 'Scenario',
  name: 'Buy',
  description: '',
  line: 1,
  type: 'scenario',
  steps: [],
  ...extra
})
const feature = (uri: string, elements: CucumberElement[]): CucumberFeature => ({
  uri,
  id: 'f',
  keyword: 'Feature',
  name: 'Shop',
  description: '',
  line: 1,
  tags: [{ name: '@smoke', line: 1 }],
  elements
})
const kinds = (envelopes: Envelope[]) => envelopes.map((envelope) => Object.keys(envelope)[0])
const pick = <K extends keyof Envelope>(envelopes: Envelope[], key: K) =>
  envelopes.flatMap((envelope) => (envelope[key] ? [envelope[key]!] : []))

describe('buildCucumberMessages', () => {
  it('should write Gherkin of a Markdown feature and run each scenario with its background', () => {
    const envelopes = buildCucumberMessages(
      [
        feature('test-suites/shop.md', [
          element({ type: 'background', name: '', steps: [step('* ', 'Open site')] }),
          element({
            start_timestamp: '2026-10-24T10:00:00.000Z',
            tags: [{ name: '@cyborg', line: 1 }],
            before: [
              {
                match: { location: 'Before: Clear cart' },
                result: { status: 'passed', duration: 1_000_000 }
              }
            ],
            steps: [
              step('* ', 'Add "Blue Top"', 'passed', {
                embeddings: [{ mime_type: 'image/png', data: 'cG5n' }]
              }),
              step('* ', 'Pay', 'failed', {
                result: { status: 'failed', duration: 3_000_000, error_message: 'boom' }
              })
            ]
          })
        ])
      ],
      { readSource: () => null, newId: IdGenerator.incrementing() }
    )

    expect(pick(envelopes, 'source')[0].data).toBe(
      '@smoke\nFeature: Shop\n\n  @cyborg\n  Scenario: Buy\n    * Open site\n    * Add "Blue Top"\n    * Pay\n'
    )
    expect(kinds(envelopes).slice(0, 7)).toEqual([
      'meta',
      'source',
      'gherkinDocument',
      'pickle',
      'hook',
      'testRunStarted',
      'testCase'
    ])
    const [testCase] = pick(envelopes, 'testCase')
    expect(testCase.testSteps.map((s) => (s.hookId ? 'hook' : 'step'))).toEqual([
      'hook',
      'step',
      'step',
      'step'
    ])
    expect(
      pick(envelopes, 'testStepFinished').map((f) => [
        f.testStepResult.status,
        f.testStepResult.message
      ])
    ).toEqual([
      ['PASSED', undefined],
      ['PASSED', undefined],
      ['PASSED', undefined],
      ['FAILED', 'boom']
    ])
    expect(pick(envelopes, 'attachment')).toMatchObject([
      {
        body: 'cG5n',
        contentEncoding: 'BASE64',
        mediaType: 'image/png',
        testStepId: testCase.testSteps[2].id
      }
    ])
    expect(pick(envelopes, 'testCaseStarted')[0].timestamp.seconds).toBe(
      Date.parse('2026-10-24T10:00:00.000Z') / 1000
    )
    expect(pick(envelopes, 'testRunFinished')[0].success).toBe(false)
  })

  it('should keep the source of a Gherkin spec and match runs to pickles by name', () => {
    const source = `Feature: Shop
  Scenario Outline: Add <product>
    When user adds "<product>"

    Examples:
      | product  |
      | Blue Top |
      | Men Tshirt |
`
    const envelopes = buildCucumberMessages(
      [
        feature('test-suites/shop.feature', [
          element({ name: 'Add Men Tshirt', steps: [step('When ', 'user adds "Men Tshirt"')] })
        ])
      ],
      { readSource: () => source, newId: IdGenerator.incrementing() }
    )

    expect(pick(envelopes, 'source')[0].data).toBe(source)
    const pickles = pick(envelopes, 'pickle')
    expect(pickles.map((p) => p.name)).toEqual(['Add Blue Top', 'Add Men Tshirt'])
    expect(pick(envelopes, 'testCase').map((tc) => tc.pickleId)).toEqual([pickles[1].id])
    expect(pick(envelopes, 'testRunFinished')[0].success).toBe(true)
  })

  it('should skip pickle steps the run has no result for', () => {
    const envelopes = buildCucumberMessages(
      [
        feature('test-suites/shop.feature', [
          element({ name: 'Buy', steps: [step('Given ', 'cart is full')] })
        ])
      ],
      {
        readSource: () =>
          'Feature: Shop\n  Scenario: Buy\n    Given cart is full\n    When user pays\n',
        newId: IdGenerator.incrementing()
      }
    )

    expect(pick(envelopes, 'testStepFinished').map((f) => f.testStepResult.status)).toEqual([
      'PASSED',
      'SKIPPED'
    ])
  })
})
