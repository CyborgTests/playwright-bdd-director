import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadStepDefinitions } from '@/framework/bdd/generator'
import { clearStepDefinitions, Given } from '@/framework/bdd/registry'
import { findAtLine, rewordStep, rewordTitle } from '@/framework/bdd/step-reword'
import { toPosix } from '@/framework/utils/helpers'

let testDir: string
let stepsFile: string
let feature: string
let markdown: string

const FEATURE = `@ui
Feature: Cart

  Scenario Outline: Add <product>
    When user adds "<product>" to cart
    Then  cart has "<product>"

    Examples:
      | product  |
      | Blue Top |

  Scenario: Pay
    Given user adds "Men Tshirt" to cart
    When user pays by card
`

const MARKDOWN = `@ui

## Shop

---

### Add twice

#### user adds "Blue Top" to cart

#### user pays by card
`

beforeEach(async () => {
  clearStepDefinitions()
  testDir = path.join(process.cwd(), `.test-tmp-reword-${crypto.randomBytes(4).toString('hex')}`)
  fs.mkdirSync(testDir, { recursive: true })
  stepsFile = path.join(testDir, 'cart.steps.ts')
  fs.writeFileSync(
    stepsFile,
    `import { Given, When } from '@/framework/bdd/registry'

When('user adds {string} to cart', async ({}, product: string) => product)

Given(
  "cart has {string}",
  async ({}, product: string) => product
)
`
  )
  feature = path.join(testDir, 'cart.feature')
  markdown = path.join(testDir, 'shop.md')
  fs.writeFileSync(feature, FEATURE)
  fs.writeFileSync(markdown, MARKDOWN)
  await loadStepDefinitions(`${toPosix(testDir)}/*.steps.ts`)
})

afterEach(() => {
  clearStepDefinitions()
  fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

const read = (file: string) => fs.readFileSync(file, 'utf-8')

describe('rewordStep', () => {
  it('should change the pattern and every step it matches, the parameter values kept', () => {
    const reworded = rewordStep('user adds {string} to cart', 'user puts {string} in the cart', [
      feature,
      markdown
    ])

    expect(read(stepsFile)).toContain("When('user puts {string} in the cart', async")
    expect(read(feature)).toContain('    When user puts "<product>" in the cart\n')
    expect(read(feature)).toContain('    Given user puts "Men Tshirt" in the cart\n')
    expect(read(markdown)).toContain('#### user puts "Blue Top" in the cart\n')
    expect(reworded.definition).toMatch(/cart\.steps\.ts:3$/)
    expect(reworded.specs.map((spec) => spec.steps)).toEqual([2, 1])
  })

  it('should find a pattern on the lines after the call and keep its quotes', () => {
    rewordStep('cart has {string}', 'cart holds {string}', [feature])

    expect(read(stepsFile)).toContain('Given(\n  "cart holds {string}",')
    expect(read(feature)).toContain('    Then  cart holds "<product>"\n')
  })

  it('should change a manual step in the specs only and tell when a definition matches it', () => {
    const before = read(stepsFile)
    const reworded = rewordStep('user pays by card', 'user pays with a card', [feature, markdown])

    expect(read(feature)).toContain('    When user pays with a card\n')
    expect(read(markdown)).toContain('#### user pays with a card\n')
    expect(read(stepsFile)).toBe(before)
    expect(reworded.definition).toBeUndefined()
    expect(reworded.automatedBy).toBeUndefined()
    expect(
      rewordStep('user pays with a card', 'cart has "Blue Top"', [feature]).automatedBy
    ).toMatch(/cart\.steps\.ts:5$/)
  })

  it('should change nothing when a check fails or only checking', () => {
    const files = [stepsFile, feature, markdown].map(read)
    const all = [feature, markdown]

    expect(() => rewordStep('user adds {string} to cart', 'user adds {int}', all)).toThrow(
      'must keep the parameters {string}'
    )
    expect(() => rewordStep('user adds {string} to cart', 'cart has {string}', all)).toThrow(
      'pattern of another step definition'
    )
    expect(() => rewordStep('user adds {string} to cart', 'user add(s) {string}', all)).toThrow(
      'no single spelling'
    )
    expect(() => rewordStep('user adds "Blue Top" to cart', 'x', all)).toThrow(
      'Give its pattern: npm run reword "user adds {string} to cart"'
    )
    expect(() => rewordStep('nobody writes this', 'x', all)).toThrow('No spec step')
    rewordStep('user adds {string} to cart', 'user puts {string} in the cart', all, {
      check: true
    })

    expect([stepsFile, feature, markdown].map(read)).toEqual(files)
  })

  it('should stop when the new pattern matches a step of another definition', () => {
    Given('cart has/holds {string}', async () => {})

    expect(() =>
      rewordStep('user adds {string} to cart', 'cart holds {string}', [feature])
    ).toThrow('would match "cart has/holds {string}"')
  })
})

describe('findAtLine', () => {
  it('should give the pattern of a defined step, the text of a manual one and titles', () => {
    expect(findAtLine(feature, 5)).toEqual({
      kind: 'step',
      text: 'user adds {string} to cart',
      definition: expect.stringMatching(/cart\.steps\.ts:3$/)
    })
    expect(findAtLine(feature, 14)).toEqual({ kind: 'step', text: 'user pays by card' })
    expect(findAtLine(markdown, 9)).toEqual({
      kind: 'step',
      text: 'user adds {string} to cart',
      definition: expect.any(String)
    })
    expect(findAtLine(feature, 2)).toEqual({ kind: 'title', label: 'Suite', text: 'Cart' })
    expect(findAtLine(feature, 4)).toEqual({
      kind: 'title',
      label: 'Test case',
      text: 'Add <product>'
    })
    expect(findAtLine(markdown, 3)).toEqual({ kind: 'title', label: 'Suite', text: 'Shop' })
    expect(findAtLine(markdown, 7)).toEqual({
      kind: 'title',
      label: 'Test case',
      text: 'Add twice'
    })
    expect(() => findAtLine(markdown, 5)).toThrow('is not a step or a title')
  })
})

describe('rewordTitle', () => {
  it('should change only the title on the line', () => {
    expect(rewordTitle(feature, 12, 'Pay by card')).toMatchObject({
      label: 'Test case',
      from: 'Pay',
      to: 'Pay by card'
    })
    rewordTitle(markdown, 7, '[TC01] Add one')

    expect(read(feature)).toContain('\n  Scenario: Pay by card\n')
    expect(read(markdown)).toContain('\n### [TC01] Add one\n')
  })

  it('should keep the spec as it was when the new title breaks it', () => {
    fs.appendFileSync(markdown, '\n---\n\n### Pay\n\n#### user pays by card\n')
    const files = [feature, markdown].map(read)

    expect(() => rewordTitle(feature, 12, 'Add <product>')).toThrow('named "Add <product>"')
    expect(() => rewordTitle(markdown, 7, 'Background')).toThrow('a Background')
    expect(() => rewordTitle(markdown, 7, 'Pay')).toThrow('named "Pay"')
    expect(() => rewordTitle(markdown, 9, 'x')).toThrow('is not a title')
    expect([feature, markdown].map(read)).toEqual(files)
  })
})
