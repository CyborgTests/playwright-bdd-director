import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { parseGherkinFile } from '@/framework/core/gherkin-parser'
import { clearMDCache, parseMDFile } from '@/framework/core/md-parser'

const TEST_DIR = path.join(process.cwd(), '.test-tmp-gherkin')

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true })
  clearMDCache()
})

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true })
  clearMDCache()
})

function createFeature(fileName: string, content: string): string {
  const filePath = path.join(TEST_DIR, fileName)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

describe('parseGherkinFile', () => {
  it('should map Feature, Scenarios and steps keeping step keywords as written', () => {
    const filePath = createFeature(
      'shop.feature',
      `Feature: Shop
  Scenario: Buy product
    Given user is on home page
    When user adds "Blue Top" to cart
    And user opens cart
    Then cart has 1 item

  Scenario: Empty cart
    Given user opens cart
    Then cart is empty
`
    )

    expect(parseGherkinFile(filePath)).toEqual({
      suiteID: '',
      suiteTtl: 'Shop',
      suiteTags: [],
      testCases: [
        {
          id: null,
          ttl: 'Buy product',
          stepTtls: [
            'Given user is on home page',
            'When user adds "Blue Top" to cart',
            'And user opens cart',
            'Then cart has 1 item'
          ],
          tags: [],
          examples: null
        },
        {
          id: null,
          ttl: 'Empty cart',
          stepTtls: ['Given user opens cart', 'Then cart is empty'],
          tags: [],
          examples: null
        }
      ]
    })
  })

  it('should read [ID] from Feature and Scenario names like MD', () => {
    const filePath = createFeature(
      'ids.feature',
      `Feature: [TS01] Shop
  Scenario: [TC01] Buy product
    Given user is on home page
  Scenario: [] Empty cart
    Given user opens cart
`
    )

    const result = parseGherkinFile(filePath)

    expect(result.suiteID).toBe('TS01')
    expect(result.suiteTtl).toBe('Shop')
    expect(result.testCases.map((tc) => [tc.id, tc.ttl])).toEqual([
      ['TC01', 'Buy product'],
      ['', 'Empty cart']
    ])
  })

  it('should map Background to first "Background" test case', () => {
    const unnamed = createFeature(
      'bg.feature',
      `Feature: Shop
  Background:
    Given user is logged in
  Scenario: Buy product
    When user buys product
`
    )
    const named = createFeature(
      'bg-named.feature',
      `Feature: Shop
  Background: Logged in user
    Given user is logged in
  Scenario: Buy product
    When user buys product
`
    )

    expect(parseGherkinFile(unnamed).testCases[0]).toEqual({
      id: null,
      ttl: 'Background',
      stepTtls: ['Given user is logged in'],
      tags: [],
      examples: null
    })
    expect(parseGherkinFile(named).testCases[0].ttl).toBe('Background: Logged in user')
  })

  it('should flatten Rule scenarios with Rule tags and ignore descriptions, tables, doc strings', () => {
    const filePath = createFeature(
      'rich.feature',
      `@shop
Feature: Shop
  Free text description

  @smoke
  Scenario: Buy product
    Given products:
      | name     |
      | Blue Top |
    When user sends note:
      """
      Hello
      """

  @discount
  Rule: Discounts
    @smoke @JIRA-12
    Scenario: Apply coupon
      Then total is reduced
`
    )

    const result = parseGherkinFile(filePath)

    expect(result.suiteTags).toEqual(['@shop'])
    expect(result.testCases).toEqual([
      {
        id: null,
        ttl: 'Buy product',
        stepTtls: ['Given products:', 'When user sends note:'],
        tags: ['@smoke'],
        examples: null
      },
      {
        id: null,
        ttl: 'Apply coupon',
        stepTtls: ['Then total is reduced'],
        tags: ['@discount', '@smoke', '@JIRA-12'],
        examples: null
      }
    ])
  })

  it('should read Scenario Outline as one test case with examples table', () => {
    const filePath = createFeature(
      'outline.feature',
      `Feature: Login
  Scenario Outline: Login as <role>
    Given user logs in as "<role>"

    Examples:
      | role  |
      | admin |
      | guest |
`
    )

    expect(parseGherkinFile(filePath).testCases).toEqual([
      {
        id: null,
        ttl: 'Login as <role>',
        stepTtls: ['Given user logs in as "<role>"'],
        tags: [],
        examples: { columns: ['role'], rows: [['admin'], ['guest']] }
      }
    ])
  })

  describe('errors', () => {
    it('should report Gherkin syntax errors with line and column', () => {
      const filePath = createFeature(
        'broken.feature',
        `Feature: Shop
  Scenario: Buy
    Given user is on home page
  garbage line
`
      )

      expect(() => parseGherkinFile(filePath)).toThrow(
        /Invalid Gherkin in .*broken\.feature[\s\S]*\(4:3\)/
      )
    })

    it('should require Feature', () => {
      const filePath = createFeature('empty.feature', '# only comment\n')

      expect(() => parseGherkinFile(filePath)).toThrow('No test suite title found')
    })

    it('should require at least one Scenario besides Background', () => {
      const filePath = createFeature(
        'bg-only.feature',
        `Feature: Shop
  Background:
    Given user is logged in
`
      )

      expect(() => parseGherkinFile(filePath)).toThrow('No test cases found')
    })

    it('should reject duplicate test case IDs', () => {
      const filePath = createFeature(
        'dup.feature',
        `Feature: Shop
  Scenario: [TC01] Buy
    Given a
  Scenario: [TC01] Sell
    Given b
`
      )

      expect(() => parseGherkinFile(filePath)).toThrow('Duplicate test case IDs')
    })

    it('should reject Background inside Rule', () => {
      const filePath = createFeature(
        'rule-bg.feature',
        `Feature: Shop
  Rule: Discounts
    Background:
      Given coupon exists
    Scenario: Apply coupon
      Then total is reduced
`
      )

      expect(() => parseGherkinFile(filePath)).toThrow('Background inside Rule is not supported')
    })

    it('should reject tags Playwright tag rules do not allow', () => {
      const filePath = createFeature(
        'bad-tag.feature',
        `Feature: Shop
  @it's
  Scenario: Buy
    Given user is on home page
`
      )

      expect(() => parseGherkinFile(filePath)).toThrow(`Invalid tag "@it's"`)
    })
  })
})

describe('parseMDFile with .feature path', () => {
  it('should delegate Gherkin specs to Gherkin parser', () => {
    const filePath = createFeature(
      'shop.feature',
      `Feature: Shop
  Scenario: Buy product
    Given user is on home page
`
    )

    expect(parseMDFile(filePath)).toEqual(parseGherkinFile(filePath))
  })
})

describe('parseGherkinFile - Scenario Outline examples', () => {
  const outline = (examples: string, title = 'Login as <role>') =>
    createFeature(
      'outline-ex.feature',
      `Feature: Login
  Scenario Outline: ${title}
    Given user logs in as "<role>"
${examples}`
    )

  it('should join several Examples blocks with same columns', () => {
    const filePath = outline(`
    Examples: Staff
      | role  |
      | admin |

    Examples: Visitors
      | role  |
      | guest |
`)

    expect(parseGherkinFile(filePath).testCases[0].examples).toEqual({
      columns: ['role'],
      rows: [['admin'], ['guest']]
    })
  })

  it('should reject Examples with different columns', () => {
    const filePath = outline(`
    Examples:
      | role  |
      | admin |

    Examples:
      | name  |
      | guest |
`)

    expect(() => parseGherkinFile(filePath)).toThrow('blocks have different columns')
  })

  it('should reject tagged Examples for now', () => {
    const filePath = outline(`
    @smoke
    Examples:
      | role  |
      | admin |
`)

    expect(() => parseGherkinFile(filePath)).toThrow('have tags - not supported yet')
  })

  it('should reject Outline title without placeholder', () => {
    const filePath = outline(
      `
    Examples:
      | role  |
      | admin |
`,
      'Login'
    )

    expect(() => parseGherkinFile(filePath)).toThrow('make test titles repeat')
  })
})
