import { test } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { generateBddTest } from '@/framework/bdd/generator'
import {
  clearStepDefinitions,
  createBdd,
  defineParameterType,
  getHookDefinitions,
  matchStepDefinitions,
  parseFixtureNames
} from '@/framework/bdd/registry'
import { DataTable, findStepDefinition, runHook, stripStepKeyword } from '@/framework/bdd/runtime'
import { getBddSpecKey, getBddTestPath, isBddTestFile } from '@/framework/utils/helpers'

const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test)
let testDir: string

beforeEach(() => {
  clearStepDefinitions()
  testDir = path.join(process.cwd(), `.test-tmp-bdd-${crypto.randomBytes(4).toString('hex')}`)
  fs.mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  clearStepDefinitions()
  fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

describe('parseFixtureNames', () => {
  it('should read destructured names, ignoring aliases and defaults', () => {
    expect(
      parseFixtureNames(
        async ({ page, loginPage: login = null }: { page: unknown; loginPage?: unknown }) => [
          page,
          login
        ]
      )
    ).toEqual(['page', 'loginPage'])
  })

  it('should give no fixtures for a step without destructuring', () => {
    expect(parseFixtureNames(async () => {})).toEqual([])
  })

  it('should reject rest syntax', () => {
    expect(() =>
      parseFixtureNames(async ({ page, ...rest }: Record<string, unknown>) => [page, rest])
    ).toThrow('Step fixtures cannot use rest syntax')
  })
})

describe('step definitions', () => {
  it('should match text without keyword and convert parameters', () => {
    Given('user has {int} items in {string} cart', async () => {})

    const [match] = matchStepDefinitions('user has 3 items in "main" cart')

    expect(match.params).toEqual([3, 'main'])
    expect(match.definition.keyword).toBe('Given')
    expect(match.definition.location).toMatch(/^tests\/unit\/bdd\.test\.ts:\d+$/)
  })

  it('should support RegExp and custom parameter types', () => {
    defineParameterType({ name: 'color', regexp: /red|green/, transformer: (s) => s.toUpperCase() })
    Then(/^light is (on|off)$/, async () => {})
    When('user picks {color}', async () => {})

    expect(matchStepDefinitions('light is on')[0].params).toEqual(['on'])
    expect(matchStepDefinitions('user picks red')[0].params).toEqual(['RED'])
  })

  it('should find the only definition for a title, keyword ignored', () => {
    Then('cart is empty', async () => {})

    expect(stripStepKeyword('And cart is empty')).toBe('cart is empty')
    expect(findStepDefinition('Given cart is empty').definition.keyword).toBe('Then')
  })

  it('should report missing and ambiguous definitions', () => {
    Then('cart is {word}', async () => {})
    Then('cart is empty', async () => {})

    expect(() => findStepDefinition('Then total is 0')).toThrow(
      'Missing step definition for "Then total is 0"'
    )
    expect(() => findStepDefinition('Then cart is empty')).toThrow(
      /Ambiguous step "Then cart is empty" matches 2 definitions:\n.*Then\('cart is \{word\}'\)/
    )
  })
})

describe('hooks', () => {
  it('should title unnamed hooks by file and number, reject duplicate names', () => {
    Before(async () => {})
    Before({ name: 'Clear cart', tags: '@cart' }, async () => {})
    After(async () => {})

    expect(getHookDefinitions().map((hook) => hook.title)).toEqual([
      'tests/unit/bdd.test#1',
      'Clear cart',
      'tests/unit/bdd.test#1'
    ])
    expect(() => Before({ name: 'Clear cart' }, async () => {})).toThrow(
      'Duplicate Before hook "Clear cart"'
    )
  })

  it('should run hook by kind and title with fixtures', async () => {
    const calls: unknown[] = []
    After({ name: 'Logout' }, async ({ page }) => {
      calls.push(page)
    })

    await runHook('After', 'Logout', { page: 'page' })

    expect(calls).toEqual(['page'])
    await expect(runHook('Before', 'Logout')).rejects.toThrow('Missing Before hook "Logout"')
  })
})

describe('DataTable', () => {
  it('should give raw rows, rows without header, hashes and rowsHash', () => {
    const table = new DataTable([
      ['name', 'price'],
      ['Blue Top', '500']
    ])

    expect(table.raw()).toEqual([
      ['name', 'price'],
      ['Blue Top', '500']
    ])
    expect(table.rows()).toEqual([['Blue Top', '500']])
    expect(table.hashes()).toEqual([{ name: 'Blue Top', price: '500' }])
    expect(table.rowsHash()).toEqual({ name: 'price', 'Blue Top': '500' })
  })
})

describe('bdd spec paths', () => {
  it('should detect step definitions style specs and mirror their path', () => {
    expect(getBddSpecKey('test-suites/bdd/shop/cart.feature', ['bdd'], 'test-suites')).toBe(
      'shop/cart'
    )
    expect(getBddSpecKey('test-suites/bdd/cart.md', ['bdd'], 'test-suites')).toBeNull()
    expect(getBddSpecKey('test-suites/cart.feature', ['bdd'], 'test-suites')).toBeNull()
    expect(getBddTestPath('shop/cart', 'tests/automated/bdd')).toBe(
      path.join('tests', 'automated', 'bdd', 'shop', 'cart.auto.test.ts')
    )
  })

  it('should tell generated tests by their folder, not by the file name', () => {
    const dir = 'tests/automated/bdd'

    expect(isBddTestFile('tests/automated/bdd/shop/cart.auto.test.ts', dir)).toBe(true)
    expect(isBddTestFile(path.resolve('tests/automated/bdd/cart.auto.test.ts'), dir)).toBe(true)
    expect(isBddTestFile('tests/automated/todo/cart.auto.test.ts', dir)).toBe(false)
    expect(isBddTestFile('tests/automated/bdd-old/cart.auto.test.ts', dir)).toBe(false)
    expect(isBddTestFile(dir, dir)).toBe(false)
  })
})

describe('generateBddTest', () => {
  const generate = (feature: string) => {
    const specPath = path.join(testDir, 'shop.feature')
    fs.writeFileSync(specPath, feature, 'utf-8')
    return generateBddTest(specPath, path.join(testDir, 'shop.auto.test.ts'))
  }

  it('should generate describe, Background, Rule, Outline rows and step calls with fixtures', async () => {
    Given('user opens the home page', async ({ page }) => page)
    When('user adds {string} to cart', async ({ page, request }) => [page, request])
    Then('cart has:', async () => {})
    Then('note says:', async () => {})

    const { content, missing, ambiguous } = await generate(`@shop
Feature: Shop
  Background:
    Given user opens the home page

  @smoke
  Scenario Outline: Add <product>
    When user adds "<product>" to cart
    Then cart has:
      | name      |
      | <product> |

    Examples:
      | product  |
      | Blue Top |
      | Men Tshirt |

  Rule: Notes
    Scenario: Leave note
      Then note says:
        """
        Hello
        """
`)

    expect(missing).toEqual([])
    expect(ambiguous).toEqual([])
    expect(content).toContain("import '../tests/unit/bdd.test'")
    expect(content).toContain("{ tag: [TAG.TEST.AUTO, TAG.TYPE.BDD, TAG.SUITE.SHOP, '@shop'] }")
    expect(content).toContain("test.beforeEach('Background', async ({ page }) => {")
    expect(content).toContain(
      "test('Add Blue Top', { tag: ['@smoke'] }, async ({ page, request }) => {"
    )
    expect(content).toContain(
      `await runStep('When user adds "Men Tshirt" to cart', { page, request })`
    )
    expect(content).toContain(
      "await runStep('Then cart has:', {}, { dataTable: [['name'], ['Blue Top']] })"
    )
    expect(content).toContain("test.describe('Notes', () => {")
    expect(content).toContain("await runStep('Then note says:', {}, { docString: 'Hello' })")
  })

  it('should generate scenario with missing steps as fixme and suggest snippets', async () => {
    const { content, missing } = await generate(`Feature: Shop
  Scenario: Search
    When user searches for "Blue Top" 2 times
`)

    expect(content).toContain(
      '// Missing step definitions: When user searches for "Blue Top" 2 times'
    )
    expect(content).toContain("test.fixme('Search', async () => {")
    expect(missing[0].snippet).toBe(
      "When('user searches for {string} {int} times', async ({ page }, string: string, int: number) => {\n  // TODO: implement step\n})"
    )
  })

  it('should emit hooks by tags and group tests with different hooks', async () => {
    Given('user is logged in', async ({ page }) => page)
    BeforeAll({ name: 'Seed', tags: '@shop' }, async ({ browser }) => browser)
    AfterAll({ name: 'Drop data', tags: '@admin' }, async () => {})
    Before({ name: 'Open', tags: 'not @api' }, async ({ page }) => page)
    After({ name: 'Clean' }, async ({ request }) => request)

    const { content } = await generate(`@shop
Feature: Shop
  Background:
    Given user is logged in

  Scenario: One
    Given user is logged in

  @api
  Scenario: Two
    Given user is logged in
`)

    expect(content).toContain("import { runHook, runStep } from '@/framework/bdd/runtime'")
    expect(content).toContain(
      "test.beforeAll('BeforeAll: Seed', async ({ browser }) => {\n    await runHook('BeforeAll', 'Seed', { browser })"
    )
    expect(content).not.toContain('Drop data')
    const groups = content.split('test.describe(() => {')
    expect(groups).toHaveLength(3)
    expect(groups[1]).toMatch(
      /beforeEach\('Before: Open'[\s\S]*beforeEach\('Background'[\s\S]*afterEach\('After: Clean'[\s\S]*test\('One'/
    )
    expect(groups[2]).not.toContain('Before: Open')
    expect(groups[2]).toMatch(
      /beforeEach\('Background'[\s\S]*afterEach\('After: Clean'[\s\S]*test\('Two'/
    )
  })

  it('should declare hooks once when all tests share them', async () => {
    Given('user is logged in', async () => {})
    Before(async ({ page }) => page)

    const { content } = await generate(`Feature: Shop
  Scenario: One
    Given user is logged in
`)

    expect(content).not.toContain('test.describe(() => {')
    expect(content).toContain(
      "test.beforeEach('Before: tests/unit/bdd.test#1', async ({ page }) => {"
    )
  })

  it('should turn special tags into modifiers and configure', async () => {
    Given('user is logged in', async () => {})

    const { content } = await generate(`@timeout:60000
Feature: Shop
  @skip
  Scenario: Skipped
    Given user is logged in

  @slow @retries:2
  Scenario: Slow
    Given user is logged in

  Rule: Broken
    @fail
    Scenario: Failing
      Given user is logged in
`)

    expect(content).toContain('test.describe.configure({ timeout: 60000 })')
    expect(content).toContain("test.skip('Skipped', { tag: ['@skip'] }, async () => {")
    expect(content).toMatch(
      /test\.describe\(\(\) => \{\s+test\.describe\.configure\(\{ retries: 2 \}\)\s+test\('Slow', \{ tag: \['@slow', '@retries:2'\] \}, async \(\) => \{\s+test\.slow\(\)/
    )
    expect(content).toContain("test.fail('Failing', { tag: ['@fail'] }, async () => {")
  })

  it('should reject invalid and conflicting configure tags', async () => {
    await expect(
      generate(`Feature: Shop
  @retries:abc
  Scenario: One
`)
    ).rejects.toThrow('Invalid tag "@retries:abc" on Scenario "One"')
    await expect(
      generate(`@timeout:1000 @timeout:2000
Feature: Shop
`)
    ).rejects.toThrow('Conflicting @timeout tags on Feature "Shop"')
  })

  it('should collect ambiguous steps', async () => {
    Then('cart is {word}', async () => {})
    Then('cart is empty', async () => {})

    const { ambiguous } = await generate(`Feature: Shop
  Scenario: Empty
    Then cart is empty
`)

    expect(ambiguous[0]).toContain('Ambiguous step "Then cart is empty" matches 2 definitions')
  })
})

describe('generateBddTest - Rule Background and languages', () => {
  const generate = (feature: string) => {
    const specPath = path.join(testDir, 'shop.feature')
    fs.writeFileSync(specPath, feature, 'utf-8')
    return generateBddTest(specPath, path.join(testDir, 'shop.auto.test.ts'))
  }
  const feature = `Feature: Shop
  Background:
    Given user is logged in

  Scenario: Browse
    Given user is logged in

  @cart
  Rule: Cart
    Background:
      Given cart is empty

    Scenario: Add
      Given user is logged in
`

  it('should run Rule Background after Feature Background', async () => {
    Given('user is logged in', async () => {})
    Given('cart is empty', async () => {})

    const { content } = await generate(feature)

    expect(content).toMatch(
      /beforeEach\('Background'[\s\S]*test\('Browse'[\s\S]*test\.describe\('Cart', \{ tag: \['@cart'\] \}, \(\) => \{\s+test\.beforeEach\('Background: Cart'[\s\S]*test\('Add'/
    )
  })

  it('should keep Before hooks, Feature and Rule Background in order inside hook groups', async () => {
    Given('user is logged in', async () => {})
    Given('cart is empty', async () => {})
    Before({ name: 'Open cart', tags: '@cart' }, async () => {})

    const { content } = await generate(feature)
    const rule = content.slice(content.indexOf("test.describe('Cart'"))

    expect(content.indexOf("beforeEach('Background'")).toBeGreaterThan(-1)
    expect(rule).toMatch(
      /beforeEach\('Before: Open cart'[\s\S]*beforeEach\('Background'[\s\S]*beforeEach\('Background: Cart'[\s\S]*test\('Add'/
    )
  })

  it('should pass the language of a non-English spec to runStep', async () => {
    Given('user opens the home page', async ({ page }) => page)

    const { content } = await generate(`# language: uk
Функціонал: Shop
  Сценарій: Open
    Припустимо, що user opens the home page
`)

    expect(content).toContain(
      "await runStep('Припустимо, що user opens the home page', { page }, { language: 'uk' })"
    )
  })
})

describe('step keywords of languages', () => {
  it('should strip the longest keyword of the language', () => {
    Given('user opens the home page', async () => {})

    expect(stripStepKeyword('Припустимо, що user opens', 'uk')).toBe('user opens')
    expect(stripStepKeyword('Дано user opens', 'uk')).toBe('user opens')
    expect(findStepDefinition('І user opens the home page', 'uk').definition.keyword).toBe('Given')
    expect(() => stripStepKeyword('Given x', 'xx')).toThrow('Unknown Gherkin language "xx"')
  })

  it('should not strip a word of English text that is a keyword in another language', () => {
    expect(stripStepKeyword('A new tab opens')).toBe('A new tab opens')
  })

  it('should accept any whitespace after the keyword, but not a longer word', () => {
    expect(stripStepKeyword('Given\tuser opens')).toBe('user opens')
    expect(stripStepKeyword('Andrew opens the page')).toBe('Andrew opens the page')
  })
})
