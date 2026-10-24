import { test } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getGeneratedTestPath, writeTests } from '@/framework/bdd/build'
import { generateTest, type MissingStep } from '@/framework/bdd/generator'
import {
  clearStepDefinitions,
  createBdd,
  defineParameterType,
  getHookDefinitions,
  hasNoCode,
  matchStepDefinitions,
  parseFixtureNames
} from '@/framework/bdd/registry'
import { DataTable, findStepDefinition, runHook, stripStepKeyword } from '@/framework/bdd/runtime'
import { addStepSkeletons } from '@/framework/bdd/skeletons'
import { parseMDFile } from '@/framework/core/md-parser'
import { markdownToGherkin } from '@/framework/core/spec-document'

const { Given, When, Then, Step, Before, After, BeforeAll, AfterAll } = createBdd(test)
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

/** Step with code - a definition without code would leave its step manual */
const done = async () => 'done'

const generate = (spec: string, extension = 'feature') => {
  const specPath = path.join(testDir, `shop.${extension}`)
  fs.writeFileSync(specPath, spec, 'utf-8')
  return generateTest(specPath, path.join(testDir, 'shop.test.ts'))
}

const flat = (content: string) => content.replace(/\s+/g, ' ')

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

describe('hasNoCode', () => {
  it('should treat an empty body or one of comments only as no code, TODO or not', () => {
    expect(hasNoCode(async () => {})).toBe(true)
    expect(
      hasNoCode(async (_fixtures: object, _name: string) => {
        // TODO: implement step
        /* later */
      })
    ).toBe(true)
    expect(hasNoCode(async function () {})).toBe(true)
  })

  it('should treat any statement or an expression body as code', () => {
    expect(hasNoCode(async ({ page }: { page: string }) => page)).toBe(false)
    expect(
      hasNoCode(async ({ page }: { page: string[] }) => {
        // TODO: assert more
        page.push('x')
      })
    ).toBe(false)
    expect(hasNoCode(done)).toBe(false)
  })
})

describe('step definitions', () => {
  it('should match text without keyword and convert parameters', () => {
    Given('user has {int} items in {string} cart', done)

    const [match] = matchStepDefinitions('user has 3 items in "main" cart')

    expect(match.params).toEqual([3, 'main'])
    expect(match.definition.keyword).toBe('Given')
    expect(match.definition.pending).toBe(false)
    expect(match.definition.location).toMatch(/^src\/framework\/bdd\/bdd\.test\.ts:\d+$/)
  })

  it('should support RegExp and custom parameter types', () => {
    defineParameterType({ name: 'color', regexp: /red|green/, transformer: (s) => s.toUpperCase() })
    Then(/^light is (on|off)$/, done)
    When('user picks {color}', done)

    expect(matchStepDefinitions('light is on')[0].params).toEqual(['on'])
    expect(matchStepDefinitions('user picks red')[0].params).toEqual(['RED'])
  })

  it('should find the only definition for a text, keyword stripped by language', () => {
    Then('cart is empty', done)

    expect(stripStepKeyword('And cart is empty')).toBe('cart is empty')
    expect(findStepDefinition(stripStepKeyword('Given cart is empty')).definition.keyword).toBe(
      'Then'
    )
  })

  it('should report missing and ambiguous definitions', () => {
    Then('cart is {word}', done)
    Then('cart is empty', done)

    expect(() => findStepDefinition('total is 0')).toThrow(
      'Missing step definition for "total is 0"'
    )
    expect(() => findStepDefinition('cart is empty')).toThrow(
      /Ambiguous step "cart is empty" matches 2 definitions:\n.*Then\('cart is \{word\}'\)/
    )
  })
})

describe('hooks', () => {
  it('should title unnamed hooks by file and number, reject duplicate names', () => {
    Before(async () => {})
    Before({ name: 'Clear cart', tags: '@cart' }, async () => {})
    After(async () => {})

    expect(getHookDefinitions().map((hook) => hook.title)).toEqual([
      'src/framework/bdd/bdd.test#1',
      'Clear cart',
      'src/framework/bdd/bdd.test#1'
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

describe('generated test paths', () => {
  it('should mirror the spec path inside the generated tests folder', () => {
    expect(
      getGeneratedTestPath('test-suites/shop/cart.feature', '.director/tests', 'test-suites')
    ).toBe(path.join('.director', 'tests', 'shop', 'cart.test.ts'))
    expect(getGeneratedTestPath('test-suites/auth.md', '.director/tests', 'test-suites')).toBe(
      path.join('.director', 'tests', 'auth.test.ts')
    )
  })
})

describe('writeTests', () => {
  it('should write changed tests only and remove tests of specs that are gone', () => {
    const dir = path.join(testDir, 'generated')
    const kept = path.join(dir, 'kept.test.ts')
    const stale = path.join(dir, 'shop', 'gone.test.ts')
    fs.mkdirSync(path.dirname(stale), { recursive: true })
    fs.writeFileSync(kept, 'same')
    fs.writeFileSync(stale, 'old')
    const generation = (testPath: string, content: string) =>
      ({ testPath, content }) as Parameters<typeof writeTests>[0][number]

    const result = writeTests(
      [generation(kept, 'same'), generation(path.join(dir, 'new.test.ts'), 'new')],
      dir
    )

    expect(result).toEqual({
      written: [path.join(dir, 'new.test.ts')],
      removed: [expect.any(String)]
    })
    expect(fs.existsSync(stale)).toBe(false)
    expect(fs.readFileSync(path.join(dir, 'new.test.ts'), 'utf-8')).toBe('new')
  })
})

describe('markdownToGherkin', () => {
  it('should write suite, Background first, cases with tags, IDs and examples as Gherkin', () => {
    const specPath = path.join(testDir, 'shop.md')
    fs.writeFileSync(
      specPath,
      `## Shop

Tags: @ui @shop

---

### [TC-01] Add <product>

Tags: @smoke

| product | price \\| tax |
| --- | --- |
| Blue Top | 500 |

#### Add "<product>" to Cart

- details are left out

---

### Background

#### Open Home Page
`,
      'utf-8'
    )

    expect(markdownToGherkin(parseMDFile(specPath), specPath)).toBe(`@ui @shop
Feature: Shop

  Background:
    * Open Home Page

  @smoke
  Scenario Outline: [TC-01] Add <product>
    * Add "<product>" to Cart

    Examples:
      | product | price \\| tax |
      | Blue Top | 500 |
`)
  })
})

describe('generateTest - auto, cyborg and layers', () => {
  it('should make a test @auto when every step has code, else @cyborg with manual steps', async () => {
    Given('user opens the home page', async ({ page }) => page)
    When('user adds {string}', async ({ page }) => page)
    Then('cart is updated', async () => {
      // TODO: implement step
    })

    const { content, tests, missing, pending, errors } = await generate(`@ui
Feature: Shop
  Scenario: Open
    Given user opens the home page

  Scenario: Add
    Given user opens the home page
    When user adds "Blue Top"
    Then cart is updated
    And cart total is 500
`)

    expect(errors).toEqual([])
    expect(flat(content)).toContain(
      "test.describe('Shop', { tag: ['@shop'] }, () => { test('Open', { tag: ['@auto', '@ui'] }, async ({ page }) => { await autoStep('Given user opens the home page', { page }) })"
    )
    expect(flat(content)).toContain(
      `test('Add', { tag: ['@cyborg', '@ui'] }, async ({ page, manualStep }) => { await autoStep('Given user opens the home page', { page }) await autoStep('When user adds "Blue Top"', { page }) await manualStep('Then cart is updated') await manualStep('And cart total is 500') })`
    )
    expect(tests.map((t) => [t.title, t.kind, t.layer, t.steps])).toEqual([
      ['Open', 'auto', '@ui', { automated: 1, total: 1 }],
      ['Add', 'cyborg', '@ui', { automated: 2, total: 4 }]
    ])
    expect(pending).toEqual([
      { title: 'Then cart is updated', location: expect.stringMatching(/bdd\.test\.ts:\d+$/) }
    ])
    expect(missing.map((step) => step.title)).toEqual(['And cart total is 500'])
  })

  it('should keep an API test with a manual step fixme - nobody walks API by hand', async () => {
    Given('user is registered', done)

    const { content, tests } = await generate(`@api
Feature: Shop
  Scenario: Login
    Given user is registered
    When user logs in
`)

    expect(content).toContain('// @api test without step definitions: When user logs in')
    expect(flat(content)).toContain(
      "test.fixme('Login', { tag: ['@auto', '@api'] }, async ({ manualStep }) => {"
    )
    expect(tests[0]).toMatchObject({ kind: 'auto', fixme: true, modifier: 'fixme' })
  })

  it('should make every test under a manual Background cyborg', async () => {
    Given('user is logged in', done)

    const { content, tests } = await generate(`@e2e
Feature: Shop
  Background:
    Given user opens the shop

  Scenario: Browse
    Given user is logged in
`)

    expect(flat(content)).toContain(
      "test.beforeEach('Background', async ({ manualStep }) => { await manualStep('Given user opens the shop') })"
    )
    expect(content).toContain("test('Browse', { tag: ['@cyborg', '@e2e'] }, async () => {")
    expect(tests[0].steps).toEqual({ automated: 1, total: 2 })
  })

  it('should take the layer of the most specific level and keep layers off describes', async () => {
    Given('user opens the home page', done)

    const { content, tests, errors } = await generate(`@ui @shop
Feature: Shop
  @api
  Rule: Backend
    Scenario: Status
      Given user opens the home page

    @e2e
    Scenario Outline: Flow <n>
      Given user opens the home page

      @ui
      Examples:
        | n |
        | 1 |
`)

    expect(errors).toEqual([])
    expect(tests.map((t) => [t.title, t.layer])).toEqual([
      ['Status', '@api'],
      ['Flow 1', '@ui']
    ])
    expect(content).toContain("test.describe('Shop', { tag: ['@shop', '@shop'] }, () => {")
    expect(content).toContain("test.describe('Backend', () => {")
    expect(content).toContain("test('Flow 1', { tag: ['@auto', '@ui'] }")
  })

  it('should report a test without layer, with two layers or with a Director tag', async () => {
    const noLayer = await generate(`Feature: Shop
  Scenario: Open
`)
    const twoLayers = await generate(`Feature: Shop
  @ui @api
  Scenario: Open
`)
    const reserved = await generate(`@ui @cyborg
Feature: Shop
  Scenario: Open
`)

    expect(noLayer.errors[0]).toContain('Test "Open" has no layer')
    expect(twoLayers.errors[0]).toContain('Test "Open" has several layers: @ui, @api')
    expect(reserved.errors[0]).toContain('Tag @cyborg in')
  })

  it('should generate a Markdown spec: steps without keywords, examples as test per row', async () => {
    Step('Open Home Page', async ({ page }) => page)
    Step('Add {string} to Cart', async ({ page }) => page)
    Step('Given flags are set', done)

    const { content, tests, missing } = await generate(
      `## Shop

Tags: @ui

### Background

#### Open Home Page

### Add <product>

| product |
| --- |
| Blue Top |
| Men Tshirt |

#### Add "<product>" to Cart

#### Given flags are set

#### Check Cart
`,
      'md'
    )

    expect(content).toContain(
      '// Generated from ' // path of the temp spec
    )
    expect(content).toContain("await autoStep('Open Home Page', { page })")
    expect(content).toContain(`await autoStep('Add "Men Tshirt" to Cart', { page })`)
    expect(content).toContain("await autoStep('Given flags are set', {}, { keyword: false })")
    expect(content).toContain("await manualStep('Check Cart')")
    expect(tests.map((t) => [t.title, t.kind])).toEqual([
      ['Add Blue Top', 'cyborg'],
      ['Add Men Tshirt', 'cyborg']
    ])
    expect(missing).toEqual([
      {
        title: 'Check Cart',
        keyword: 'Step',
        expression: 'Check Cart',
        snippet: "Step('Check Cart', async ({}) => {\n  // TODO: implement step\n})"
      }
    ])
  })

  it('should suggest typed snippets for Gherkin steps', async () => {
    const { missing } = await generate(`@ui
Feature: Shop
  Scenario: Search
    When user searches for "Blue Top" 2 times
`)

    expect(missing[0].snippet).toBe(
      "When('user searches for {string} {int} times', async ({}, _string: string, _int: number) => {\n  // TODO: implement step\n})"
    )
  })
})

describe('generateTest - structure', () => {
  it('should generate describe, Background, Rule, Outline rows and step calls with fixtures', async () => {
    Given('user opens the home page', async ({ page }) => page)
    When('user adds {string} to cart', async ({ page, request }) => [page, request])
    Then('cart has:', done)
    Then('note says:', done)

    const { content, missing, errors } = await generate(`@ui @shop
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
    expect(errors).toEqual([])
    expect(content).toContain("import '@/framework/bdd/bdd.test'")
    expect(content).toContain("{ tag: ['@shop', '@shop'] }")
    expect(content).toContain("test.beforeEach('Background', async ({ page }) => {")
    expect(content).toContain(
      "test('Add Blue Top', { tag: ['@auto', '@ui', '@smoke'] }, async ({ page, request }) => {"
    )
    expect(content).toContain(
      `await autoStep('When user adds "Men Tshirt" to cart', { page, request })`
    )
    expect(content).toContain(
      "await autoStep('Then cart has:', {}, { dataTable: [['name'], ['Blue Top']] })"
    )
    expect(content).toContain("test.describe('Notes', () => {")
    expect(content).toContain("await autoStep('Then note says:', {}, { docString: 'Hello' })")
  })

  it('should emit hooks by tags and group tests with different hooks', async () => {
    Given('user is logged in', async ({ page }) => page)
    BeforeAll({ name: 'Seed', tags: '@shop' }, async ({ browser }) => browser)
    AfterAll({ name: 'Drop data', tags: '@admin' }, async () => {})
    Before({ name: 'Open', tags: 'not @api' }, async ({ page }) => page)
    After({ name: 'Clean' }, async ({ request }) => request)

    const { content } = await generate(`@ui
Feature: Shop
  Background:
    Given user is logged in

  Scenario: One
    Given user is logged in

  @api
  Scenario: Two
    Given user is logged in
`)

    expect(content).toContain("import { autoStep, runHook } from '@/framework/bdd/runtime'")
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

  it('should match hooks by the kind tag too', async () => {
    Given('user is logged in', done)
    Before({ name: 'Brief the person', tags: '@cyborg' }, async () => {})

    const { content } = await generate(`@ui
Feature: Shop
  Scenario: Auto
    Given user is logged in

  Scenario: Cyborg
    Given user checks the colors
`)

    // A test without hooks needs no group
    const groups = content.split('test.describe(() => {')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toContain("test('Auto'")
    expect(groups[0]).not.toContain('Brief the person')
    expect(groups[1]).toMatch(/Before: Brief the person[\s\S]*test\('Cyborg'/)
  })

  it('should turn special tags into modifiers and configure', async () => {
    Given('user is logged in', done)

    const { content } = await generate(`@ui @timeout:60000
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
    expect(content).toContain(
      "test.skip('Skipped', { tag: ['@auto', '@ui', '@skip'] }, async () => {"
    )
    expect(content).toMatch(
      /test\.describe\(\(\) => \{\s+test\.describe\.configure\(\{ retries: 2 \}\)\s+test\('Slow', \{ tag: \['@auto', '@ui', '@slow', '@retries:2'\] \}, async \(\) => \{\s+test\.slow\(\)/
    )
    expect(content).toContain(
      "test.fail('Failing', { tag: ['@auto', '@ui', '@fail'] }, async () => {"
    )
  })

  it('should reject invalid and conflicting configure tags', async () => {
    await expect(
      generate(`@ui
Feature: Shop
  @retries:abc
  Scenario: One
`)
    ).rejects.toThrow('Invalid tag "@retries:abc" on Scenario "One"')
    await expect(
      generate(`@ui @timeout:1000 @timeout:2000
Feature: Shop
`)
    ).rejects.toThrow('Conflicting @timeout tags on Feature "Shop"')
  })

  it('should report ambiguous steps', async () => {
    Then('cart is {word}', done)
    Then('cart is empty', done)

    const { errors } = await generate(`@ui
Feature: Shop
  Scenario: Empty
    Then cart is empty
`)

    expect(errors[0]).toContain('Ambiguous step "Then cart is empty" matches 2 definitions')
  })
})

describe('generateTest - Rule Background and languages', () => {
  const feature = `@ui
Feature: Shop
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
    Given('user is logged in', done)
    Given('cart is empty', done)

    const { content } = await generate(feature)

    expect(content).toMatch(
      /beforeEach\('Background'[\s\S]*test\('Browse'[\s\S]*test\.describe\('Cart', \{ tag: \['@cart'\] \}, \(\) => \{\s+test\.beforeEach\('Background: Cart'[\s\S]*test\('Add'/
    )
  })

  it('should make Rule tests cyborg when only the Rule Background is manual', async () => {
    Given('user is logged in', done)

    const { tests } = await generate(feature)

    expect(tests.map((t) => [t.title, t.kind])).toEqual([
      ['Browse', 'auto'],
      ['Add', 'cyborg']
    ])
  })

  it('should keep Before hooks, Feature and Rule Background in order inside hook groups', async () => {
    Given('user is logged in', done)
    Given('cart is empty', done)
    Before({ name: 'Open cart', tags: '@cart' }, async () => {})

    const { content } = await generate(feature)
    const rule = content.slice(content.indexOf("test.describe('Cart'"))

    expect(content.indexOf("beforeEach('Background'")).toBeGreaterThan(-1)
    expect(rule).toMatch(
      /beforeEach\('Before: Open cart'[\s\S]*beforeEach\('Background'[\s\S]*beforeEach\('Background: Cart'[\s\S]*test\('Add'/
    )
  })

  it('should pass the language of a non-English spec to autoStep', async () => {
    Given('user opens the home page', async ({ page }) => page)

    const { content } = await generate(`# language: uk
@ui
Функціонал: Shop
  Сценарій: Open
    Припустимо, що user opens the home page
`)

    expect(content).toContain(
      "await autoStep('Припустимо, що user opens the home page', { page }, { language: 'uk' })"
    )
  })
})

describe('step keywords of languages', () => {
  it('should strip the longest keyword of the language', () => {
    Given('user opens the home page', done)

    expect(stripStepKeyword('Припустимо, що user opens', 'uk')).toBe('user opens')
    expect(stripStepKeyword('Дано user opens', 'uk')).toBe('user opens')
    expect(
      findStepDefinition(stripStepKeyword('І user opens the home page', 'uk')).definition.keyword
    ).toBe('Given')
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

describe('addStepSkeletons', () => {
  const missing = (keyword: MissingStep['keyword'], expression: string, params = '{}') => ({
    title: expression,
    keyword,
    expression,
    snippet: `${keyword}('${expression}', async (${params}) => {\n  // TODO: implement step\n})`
  })

  it('should start a step file with the step functions it uses, one skeleton per expression', () => {
    const { content, added } = addStepSkeletons('', [
      missing('Step', 'Open Cart'),
      missing('Step', 'Open Cart'),
      missing('Then', 'cart has:', '{}, _dataTable: DataTable')
    ])

    expect(added).toBe(2)
    expect(content).toBe(`import { DataTable } from '@/framework/bdd'

import { Step, Then } from './bdd'

Step('Open Cart', async ({}) => {
  // TODO: implement step
})

Then('cart has:', async ({}, _dataTable: DataTable) => {
  // TODO: implement step
})
`)
  })

  it('should merge into the existing import and append after the existing steps', () => {
    const existing = `import { Given } from './bdd'

Given('user opens the home page', async ({ homePage }) => {
  await homePage.open()
})
`

    const { content } = addStepSkeletons(existing, [missing('When', 'user pays')])

    expect(content).toBe(`import { Given, When } from './bdd'

Given('user opens the home page', async ({ homePage }) => {
  await homePage.open()
})

When('user pays', async ({}) => {
  // TODO: implement step
})
`)
  })
})
