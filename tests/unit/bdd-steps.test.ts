import { test } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { generateBddTest } from '@/framework/bdd/generator'
import {
  clearStepDefinitions,
  createBdd,
  getHookDefinitions,
  getPomNodes,
  Given as GivenMethod,
  matchStepDefinitions,
  type PomClass,
  type StepDecorator,
  StepsFor,
  When as WhenMethod
} from '@/framework/bdd/registry'

interface World {
  email: string
}

const { Given, When, BeforeStep, AfterStep, Before } = createBdd(
  test.extend<{ homePage: { open: () => string }; world: World }>({})
)
const cucumber = createBdd(test.extend<{ world: World }>({}), { world: 'world' })
let testDir: string

beforeEach(() => {
  clearStepDefinitions()
  testDir = path.join(process.cwd(), `.test-tmp-bdd-steps-${crypto.randomBytes(4).toString('hex')}`)
  fs.mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  clearStepDefinitions()
  fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

const generate = (feature: string) => {
  const specPath = path.join(testDir, 'shop.feature')
  fs.writeFileSync(specPath, feature, 'utf-8')
  return generateBddTest(specPath, path.join(testDir, 'shop.auto.test.ts'))
}

describe('step functions', () => {
  it('should return the step function to call it directly with its fixtures', async () => {
    const openHome = Given('user opens the home page', async ({ homePage }) => homePage.open())
    const search = When('user searches {string}', async ({}, query: string) => query.toUpperCase())

    expect(await openHome({ homePage: { open: () => 'home' } })).toBe('home')
    expect(await search({}, 'top')).toBe('TOP')
  })

  it('should run world style steps with the world as this and request the world fixture', async () => {
    const login = cucumber.Given('user logs in as {string}', async function (email: string) {
      this.email = email
    })
    const world: World = { email: '' }

    await login.call(world, 'a@b.c')

    expect(world.email).toBe('a@b.c')
    expect(matchStepDefinitions('user logs in as "x"')[0].definition.fixtureNames).toEqual([
      'world'
    ])
    const { content } = await generate(`Feature: Shop
  Scenario: Login
    Given user logs in as "a@b.c"
`)
    expect(content).toContain(`await runStep('Given user logs in as "a@b.c"', { world })`)
  })
})

describe('bdd context', () => {
  it('should never request bdd as a fixture', async () => {
    Given('user opens the home page', async ({ homePage, bdd }) => [homePage, bdd])
    Before({ name: 'Log tags' }, async ({ bdd }) => bdd.tags)

    const { content } = await generate(`Feature: Shop
  Scenario: Open
    Given user opens the home page
`)

    expect(content).toContain(
      "test.beforeEach('Before: Log tags', async () => {\n    await runHook('Before', 'Log tags')"
    )
    expect(content).toContain("await runStep('Given user opens the home page', { homePage })")
  })
})

describe('step hooks', () => {
  it('should register step hooks by tags before Before hooks and Background', async () => {
    Given('user opens the home page', async ({ homePage }) => homePage)
    BeforeStep({ name: 'Mark', tags: '@ui' }, async () => {})
    AfterStep({ name: 'Screenshot' }, async ({ page }) => page)
    Before({ name: 'Open' }, async () => {})

    const { content } = await generate(`Feature: Shop
  Background:
    Given user opens the home page

  @ui
  Scenario: One
    Given user opens the home page

  Scenario: Two
    Given user opens the home page
`)

    expect(content).toContain(
      "import { runHook, runStep, useStepHook } from '@/framework/bdd/runtime'"
    )
    const groups = content.split('test.describe(() => {')
    expect(groups).toHaveLength(3)
    expect(groups[1]).toMatch(
      /beforeEach\('BeforeStep: Mark'[\s\S]*useStepHook\('BeforeStep', 'Mark'\)[\s\S]*beforeEach\('AfterStep: Screenshot', async \(\{ page \}\)[\s\S]*useStepHook\('AfterStep', 'Screenshot', \{ page \}\)[\s\S]*beforeEach\('Before: Open'[\s\S]*beforeEach\('Background'[\s\S]*test\('One'/
    )
    expect(groups[2]).not.toContain('BeforeStep: Mark')
    expect(groups[2]).toContain("useStepHook('AfterStep', 'Screenshot', { page })")
    expect(getHookDefinitions().map((hook) => hook.kind)).toEqual([
      'BeforeStep',
      'AfterStep',
      'Before'
    ])
  })

  it('should give world style hooks the world fixture', async () => {
    cucumber.Given('user opens the home page', async function () {})
    cucumber.AfterStep({ name: 'Log' }, async function () {
      return this.email
    })

    const { content } = await generate(`Feature: Shop
  Scenario: Open
    Given user opens the home page
`)

    expect(content).toContain("useStepHook('AfterStep', 'Log', { world })")
  })
})

/**
 * Decorators applied by calls: Vitest does not compile decorator syntax (tsx and Playwright do)
 */
function defineSteps(
  owner: PomClass,
  fixture: string,
  methods: Array<[StepDecorator, string]>,
  options: { tags?: string; parent?: object } = {}
): object {
  const metadata = Object.create(options.parent ?? null) as object
  for (const [decorator, name] of methods) {
    decorator(owner.prototype[name], {
      kind: 'method',
      name,
      static: false,
      private: false,
      metadata
    } as unknown as ClassMethodDecoratorContext)
  }
  StepsFor(fixture, { tags: options.tags })(owner, {
    kind: 'class',
    name: owner.name,
    metadata
  } as unknown as ClassDecoratorContext)
  return metadata
}

describe('Page Object steps', () => {
  class HomePage {
    async open() {}
    async click(_button: string) {}
  }
  class MobileHomePage extends HomePage {
    override async click(_button: string) {}
    async swipe() {}
  }
  class AdminHomePage extends HomePage {
    async settings() {}
  }

  const register = () => {
    const home = defineSteps(HomePage, 'homePage', [
      [GivenMethod('user opens the home page'), 'open'],
      [WhenMethod('user clicks {string}'), 'click']
    ])
    defineSteps(
      MobileHomePage,
      'mobileHomePage',
      [
        [WhenMethod('user clicks {string}'), 'click'],
        [WhenMethod('user swipes'), 'swipe']
      ],
      { tags: '@mobile', parent: home }
    )
    defineSteps(
      AdminHomePage,
      'adminHomePage',
      [[WhenMethod('admin opens settings'), 'settings']],
      {
        parent: home
      }
    )
  }

  it('should register decorated methods once, an override not as a new step', () => {
    register()

    expect(getPomNodes().map((node) => node.fixture)).toEqual([
      'homePage',
      'mobileHomePage',
      'adminHomePage'
    ])
    const matches = matchStepDefinitions('user clicks "Login"')
    expect(matches).toHaveLength(1)
    expect(matches[0].definition.method).toEqual({ owner: HomePage, name: 'click' })
    expect(matches[0].definition.fixtureNames).toEqual([])
    expect(matches[0].definition.location).toMatch(/^tests\/unit\/bdd-steps\.test\.ts:\d+$/)
    expect(matches[0].params).toEqual(['Login'])
  })

  it('should choose the fixture by tags and keep one object within a scenario', async () => {
    register()

    const { content } = await generate(`Feature: Shop
  Scenario: Desktop
    Given user opens the home page

  @mobile
  Scenario: Mobile
    Given user opens the home page
    When user swipes

  Scenario: Admin
    Given user opens the home page
    When admin opens settings
`)

    expect(content).toMatch(
      /test\('Desktop', async \(\{ homePage \}\)[\s\S]*runStep\('Given user opens the home page', \{ homePage \}\)/
    )
    expect(content).toMatch(
      /test\('Mobile', \{ tag: \['@mobile'\] \}, async \(\{ mobileHomePage \}\)[\s\S]*runStep\('Given user opens the home page', \{ mobileHomePage \}\)[\s\S]*runStep\('When user swipes', \{ mobileHomePage \}\)/
    )
    expect(content).toMatch(
      /test\('Admin', async \(\{ adminHomePage \}\)[\s\S]*runStep\('Given user opens the home page', \{ adminHomePage \}\)/
    )
  })

  it('should reject a step that fits unrelated tagged subclasses', async () => {
    register()
    class TabletHomePage extends HomePage {}
    defineSteps(TabletHomePage, 'tabletHomePage', [], { tags: '@tablet' })

    await expect(
      generate(`Feature: Shop
  @mobile @tablet
  Scenario: Both
    Given user opens the home page
`)
    ).rejects.toThrow('fits several Page Objects: mobileHomePage, tabletHomePage')
  })

  it('should reject a fixture registered twice and a static step method', () => {
    register()

    expect(() => defineSteps(class Other {}, 'homePage', [])).toThrow(
      'Fixture "homePage" has two step classes'
    )
    expect(() =>
      GivenMethod('static step')(() => {}, {
        static: true,
        private: false,
        name: 'x',
        metadata: {}
      } as unknown as ClassMethodDecoratorContext)
    ).toThrow('decorates a static or private method')
  })
})
