import { describe, expect, it } from 'vitest'

import type { ParsedMD } from '@/framework/core/md-parser'
import {
  buildCucumberReport,
  type RunSpec,
  type RunStep,
  type TestRun
} from '@/framework/reporting/cucumber-report'

const step = (title: string, extra: Partial<RunStep> = {}): RunStep => ({
  title,
  category: 'test.step',
  durationMs: 10,
  steps: [],
  ...extra
})
const hook = (title: string, steps: RunStep[] = [], extra: Partial<RunStep> = {}): RunStep => ({
  title,
  category: 'hook',
  durationMs: 5,
  steps,
  ...extra
})
const run = (extra: Partial<TestRun>): TestRun => ({
  file: '.director/tests/shop.test.ts',
  title: 'Buy',
  line: 7,
  tags: ['@cyborg', '@shop'],
  status: 'passed',
  durationMs: 100,
  steps: [],
  screenshots: [],
  ...extra
})
const spec = (parsed: Partial<ParsedMD>, extra: Partial<RunSpec> = {}): RunSpec => ({
  path: 'test-suites/shop.md',
  parsed: { suiteID: '', suiteTtl: 'Shop', suiteTags: ['@smoke'], testCases: [], ...parsed },
  language: null,
  ...extra
})
const statuses = (steps: Array<{ name: string; result: { status: string } }>) =>
  steps.map((s) => `${s.name}: ${s.result.status}`)

describe('buildCucumberReport', () => {
  it('should give Markdown spec structure with run results, manual steps included', () => {
    const shop = spec({
      testCases: [
        { id: null, ttl: 'Background', stepTtls: ['Open site'], tags: [], examples: null },
        {
          id: null,
          ttl: 'Buy',
          stepTtls: ['Add "Blue Top"', 'Check cart', 'Pay'],
          tags: [],
          examples: null
        }
      ]
    })

    const [feature] = buildCucumberReport(
      [
        run({
          steps: [
            hook('Before Hooks', [hook('Background', [step('✋ [MANUAL] Open site')])]),
            step('Add "Blue Top"'),
            step('✋ [MANUAL] Check cart', { error: 'Cart is empty' })
          ],
          status: 'failed'
        })
      ],
      () => shop
    )

    expect(feature).toMatchObject({
      uri: 'test-suites/shop.md',
      keyword: 'Feature',
      name: 'Shop',
      tags: [{ name: '@smoke', line: 1 }]
    })
    const [background, scenario] = feature.elements
    expect(background).toMatchObject({ type: 'background', keyword: 'Background' })
    expect(statuses(background.steps)).toEqual(['Open site: passed'])
    expect(scenario).toMatchObject({ type: 'scenario', keyword: 'Scenario', name: 'Buy', line: 7 })
    expect(scenario.tags).toEqual([
      { name: '@cyborg', line: 7 },
      { name: '@shop', line: 7 }
    ])
    expect(scenario.steps[0]).toMatchObject({ keyword: '* ', name: 'Add "Blue Top"' })
    expect(statuses(scenario.steps)).toEqual([
      'Add "Blue Top": passed',
      'Check cart: failed',
      'Pay: skipped'
    ])
    expect(scenario.steps[1].result).toEqual({
      status: 'failed',
      duration: 10_000_000,
      error_message: 'Cart is empty'
    })
  })

  it('should fill Outline rows, split keywords and run Rule Background hooks before steps', () => {
    const feature = spec(
      {
        testCases: [
          {
            id: null,
            ttl: 'Add <product>',
            stepTtls: ['Given cart is empty', 'When user adds "<product>"'],
            tags: [],
            examples: { columns: ['product'], rows: [['Blue Top'], ['Men Tshirt']] }
          }
        ]
      },
      { path: 'test-suites/shop.feature', language: 'en' }
    )

    const [result] = buildCucumberReport(
      [
        run({
          file: '.director/tests/shop.test.ts',
          title: 'Add Men Tshirt',
          steps: [
            hook('Before Hooks', [
              hook('AfterStep: Screenshot'),
              hook('Before: Clear cart'),
              hook('Background: Cart', [step('Given cart is empty')])
            ]),
            step('When user adds "Men Tshirt"'),
            hook('After Hooks', [hook('After: Attach page URL on failure')])
          ]
        })
      ],
      () => feature
    )

    const [scenario] = result.elements
    expect(scenario.keyword).toBe('Scenario Outline')
    expect(scenario.steps.map((s) => [s.keyword, s.name, s.result.status])).toEqual([
      ['Given ', 'cart is empty', 'passed'],
      ['When ', 'user adds "Men Tshirt"', 'passed']
    ])
    expect(scenario.before).toEqual([
      {
        match: { location: 'Before: Clear cart' },
        result: { status: 'passed', duration: 5_000_000 }
      }
    ])
    expect(scenario.after?.[0].match.location).toBe('After: Attach page URL on failure')
  })

  it('should fail the first step that did not run for an error outside steps, with screenshots', () => {
    const shop = spec({
      testCases: [{ id: null, ttl: 'Buy', stepTtls: ['Add', 'Pay'], tags: [], examples: null }]
    })

    const [feature] = buildCucumberReport(
      [
        run({
          status: 'timedOut',
          error: 'Test timeout of 45000ms exceeded',
          steps: [step('Add')],
          screenshots: [{ mimeType: 'image/png', base64: 'c2NyZWVu' }]
        })
      ],
      () => shop
    )

    const [, pay] = feature.elements[0].steps
    expect(pay.result).toEqual({
      status: 'failed',
      duration: 0,
      error_message: 'Test timeout of 45000ms exceeded'
    })
    expect(pay.embeddings).toEqual([{ mime_type: 'image/png', data: 'c2NyZWVu' }])
  })

  it('should report a step skipped from inside and embed step attachments before screenshots', () => {
    const shop = spec({
      testCases: [
        { id: null, ttl: 'Buy', stepTtls: ['Add', 'Check', 'Pay'], tags: [], examples: null }
      ]
    })
    const after = { mimeType: 'image/png', base64: 'YWZ0ZXI=' }

    const [feature] = buildCucumberReport(
      [
        run({
          status: 'failed',
          steps: [
            step('Add', { attachments: [after] }),
            step('Check', { skipped: true }),
            step('Pay', { error: 'boom', attachments: [after] })
          ],
          screenshots: [{ mimeType: 'image/png', base64: 'c2NyZWVu' }]
        })
      ],
      () => shop
    )

    const [add, check, pay] = feature.elements[0].steps
    expect(statuses([add, check, pay])).toEqual(['Add: passed', 'Check: skipped', 'Pay: failed'])
    expect(add.embeddings).toEqual([{ mime_type: 'image/png', data: 'YWZ0ZXI=' }])
    expect(pay.embeddings?.map((e) => e.data)).toEqual(['YWZ0ZXI=', 'c2NyZWVu'])
  })

  it('should keep a known bug failed with its tag, and fail a test that passes despite it', () => {
    const shop = spec({
      testCases: [{ id: null, ttl: 'Buy', stepTtls: ['Add', 'Pay'], tags: [], examples: null }]
    })

    const [feature] = buildCucumberReport(
      [
        run({
          status: 'failed',
          expectedToFail: '@fail:tablet',
          steps: [step('Add'), step('Pay', { error: 'Button is covered' })]
        }),
        run({ title: 'Buy again', expectedToFail: '@fail', steps: [step('Add'), step('Pay')] })
      ],
      () => shop
    )

    const [knownBug, fixed] = feature.elements
    expect(knownBug.steps[1].result.error_message).toBe(
      'Expected to fail (@fail:tablet): a known bug\nButton is covered'
    )
    expect(statuses(fixed.steps)).toEqual(['Add: passed', 'Pay: passed'])
    expect(fixed.after).toEqual([
      {
        match: { location: 'Test' },
        result: {
          status: 'failed',
          duration: 0,
          error_message: 'Passed, but tagged @fail: the bug looks fixed - drop the tag'
        }
      }
    ])
  })

  it('should split a spec into a feature per device only when asked', () => {
    const shop = spec({
      testCases: [{ id: null, ttl: 'Buy', stepTtls: ['Add'], tags: [], examples: null }]
    })
    const runs = [
      run({ project: 'tablet', steps: [step('Add')] }),
      run({ project: 'chrome', steps: [step('Add')] })
    ]

    const one = buildCucumberReport(runs, () => shop)
    const perDevice = buildCucumberReport(runs, () => shop, { devices: true })

    expect(one).toHaveLength(1)
    expect(one[0].elements).toHaveLength(2)
    expect(one[0]).not.toHaveProperty('device')
    expect(perDevice.map((f) => [f.uri, f.device, f.elements.length])).toEqual([
      ['test-suites/shop.md', 'chrome', 1],
      ['test-suites/shop.md', 'tablet', 1]
    ])
  })

  it('should skip every step of a skipped test', () => {
    const shop = spec({
      testCases: [{ id: null, ttl: 'Buy', stepTtls: ['Add'], tags: [], examples: null }]
    })

    const [feature] = buildCucumberReport([run({ status: 'skipped' })], () => shop)

    expect(statuses(feature.elements[0].steps)).toEqual(['Add: skipped'])
  })

  it('should use localized keywords of a non-English spec', () => {
    const feature = spec(
      {
        testCases: [
          {
            id: null,
            ttl: 'Open',
            stepTtls: ['Припустимо, що user opens the home page'],
            tags: [],
            examples: null
          }
        ]
      },
      { path: 'test-suites/shop.feature', language: 'uk' }
    )

    const [result] = buildCucumberReport(
      [run({ title: 'Open', steps: [step('Припустимо, що user opens the home page')] })],
      () => feature
    )

    expect(result.keyword).toBe('Функціонал')
    expect(result.elements[0].keyword).toBe('Сценарій')
    expect(result.elements[0].steps[0]).toMatchObject({
      keyword: 'Припустимо, що ',
      name: 'user opens the home page'
    })
  })

  it('should report a test without spec as a feature of its file, matched by ID otherwise', () => {
    const shop = spec({
      testCases: [{ id: 'TC-01', ttl: 'Buy', stepTtls: ['Add'], tags: [], examples: null }]
    })

    const features = buildCucumberReport(
      [
        run({
          file: '.director/tests/other.test.ts',
          title: 'Lonely',
          steps: [step('Given x')]
        }),
        run({ title: '[TC-01-CYBORG] Buy', steps: [step('Add')] })
      ],
      (file) => (file.includes('shop') ? shop : null)
    )

    expect(features.map((f) => [f.uri, f.name])).toEqual([
      ['.director/tests/other.test.ts', '.director/tests/other.test.ts'],
      ['test-suites/shop.md', 'Shop']
    ])
    expect(features[0].elements[0].steps[0]).toMatchObject({ keyword: 'Given ', name: 'x' })
    expect(statuses(features[1].elements[0].steps)).toEqual(['Add: passed'])
  })
})
