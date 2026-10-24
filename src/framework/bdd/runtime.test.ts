import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BddContext } from '@/framework/bdd/registry'

/** Playwright test.step / test.info outside a Playwright run: the step body gets a skip-able step info */
const runner = vi.hoisted(() => {
  class StepSkip extends Error {}
  const state = {
    info: { tags: ['@ui'], title: 'Scenario' } as Record<string, unknown>,
    steps: [] as Array<{ title: string; status: 'passed' | 'failed' | 'skipped' }>
  }
  const step = async (title: string, body: (info: unknown) => Promise<unknown>) => {
    const info = {
      skip: (condition: boolean, description?: string) => {
        if (condition) throw new StepSkip(description)
      },
      attach: async () => {}
    }
    try {
      await body(info)
      state.steps.push({ title, status: 'passed' })
    } catch (error: unknown) {
      if (error instanceof StepSkip) {
        state.steps.push({ title, status: 'skipped' })
        return
      }
      state.steps.push({ title, status: 'failed' })
      throw error
    }
  }
  return { state, test: { step, info: () => state.info } }
})

vi.mock('@playwright/test', () => ({ test: runner.test }))

const {
  clearStepDefinitions,
  createBdd,
  StepsFor,
  Given: GivenMethod
} = await import('@/framework/bdd/registry')
const { runHook, autoStep, useStepHook } = await import('@/framework/bdd/runtime')

interface Fixtures {
  page: string
  world: { calls: string[] }
}

const { Given, BeforeStep, AfterStep, Before } = createBdd(
  runner.test as unknown as import('@playwright/test').TestType<Fixtures, object>
)
const cucumber = createBdd(
  runner.test as unknown as import('@playwright/test').TestType<Fixtures, object>,
  { world: 'world' }
)
let calls: string[]

beforeEach(() => {
  clearStepDefinitions()
  calls = []
  runner.state.info = { tags: ['@ui'], title: 'Scenario' }
  runner.state.steps = []
})

afterEach(() => clearStepDefinitions())

describe('autoStep', () => {
  it('should give the step its fixtures, parameters and context', async () => {
    let context: BddContext | undefined
    Given('user has {int} items', async ({ page, bdd }, count: number) => {
      context = bdd
      calls.push(`${page}:${count}`)
    })

    await autoStep('Given user has 2 items', { page: 'page' })

    expect(calls).toEqual(['page:2'])
    expect(context).toMatchObject({
      tags: ['@ui'],
      scenario: 'Scenario',
      step: { title: 'Given user has 2 items' }
    })
  })

  it('should run step hooks around the step, AfterStep in reverse order and on failure', async () => {
    Given('step fails', async () => {
      calls.push('step')
      throw new Error('boom')
    })
    BeforeStep({ name: 'B' }, async ({ page, bdd }) => {
      calls.push(`before ${page} ${bdd.step?.title}`)
    })
    AfterStep({ name: 'A1' }, async ({ bdd }) => {
      calls.push(`after1 ${(bdd.step?.error as Error).message}`)
    })
    AfterStep({ name: 'A2' }, async () => {
      calls.push('after2')
    })
    useStepHook('BeforeStep', 'B', { page: 'page' })
    useStepHook('AfterStep', 'A1')
    useStepHook('AfterStep', 'A2')

    await expect(autoStep('Given step fails')).rejects.toThrow('boom')

    expect(calls).toEqual(['before page Given step fails', 'step', 'after2', 'after1 boom'])
    expect(runner.state.steps).toEqual([{ title: 'Given step fails', status: 'failed' }])
  })

  it('should skip the step from BeforeStep or the step, still running AfterStep', async () => {
    Given('optional step', async () => {
      calls.push('step')
    })
    Given('self skipping step', async ({ bdd }) => {
      bdd.step?.skip('not today')
      calls.push('unreachable')
    })
    BeforeStep({ name: 'Skip optional' }, async ({ bdd }) => {
      if (bdd.step?.title.includes('optional')) bdd.step.skip()
    })
    AfterStep({ name: 'Log' }, async ({ bdd }) => {
      calls.push(`after error=${String(bdd.step?.error)}`)
    })
    useStepHook('BeforeStep', 'Skip optional')
    useStepHook('AfterStep', 'Log')

    await autoStep('Given optional step')
    await autoStep('Given self skipping step')

    expect(calls).toEqual(['after error=undefined', 'after error=undefined'])
    expect(runner.state.steps.map((step) => step.status)).toEqual(['skipped', 'skipped'])
  })

  it('should fail a passed step when AfterStep fails, and forbid skip in AfterStep', async () => {
    Given('passing step', async () => 'passed')
    AfterStep({ name: 'Skip late' }, async ({ bdd }) => bdd.step?.skip())
    useStepHook('AfterStep', 'Skip late')

    await expect(autoStep('Given passing step')).rejects.toThrow('AfterStep hook cannot skip step')
  })

  it('should keep step hooks per test', async () => {
    Given('plain step', async () => 'passed')
    BeforeStep({ name: 'B' }, async () => {
      calls.push('before')
    })
    useStepHook('BeforeStep', 'B')
    runner.state.info = { tags: [], title: 'Other test' }

    await autoStep('Given plain step')

    expect(calls).toEqual([])
  })

  it('should run world style steps and hooks with the world as this', async () => {
    const world = { calls: [] as string[] }
    cucumber.Given('user logs in as {string}', async function (email: string) {
      this.calls.push(email)
    })
    cucumber.Before({ name: 'Start' }, async function () {
      this.calls.push('before')
    })

    await runHook('Before', 'Start', { world })
    await autoStep('Given user logs in as "a@b.c"', { world })

    expect(world.calls).toEqual(['before', 'a@b.c'])
  })

  it('should call a Page Object method on the passed object, overrides included', async () => {
    class HomePage {
      constructor(readonly calls: string[]) {}
      async click(button: string) {
        this.calls.push(`home ${button}`)
      }
    }
    class MobileHomePage extends HomePage {
      override async click(button: string) {
        this.calls.push(`mobile ${button}`)
      }
    }
    const metadata = {}
    GivenMethod('user clicks {string}')(HomePage.prototype.click, {
      name: 'click',
      static: false,
      private: false,
      metadata
    } as unknown as ClassMethodDecoratorContext)
    StepsFor('homePage')(HomePage, { metadata } as unknown as ClassDecoratorContext)
    const log: string[] = []

    await autoStep('Given user clicks "Login"', { mobileHomePage: new MobileHomePage(log) })

    expect(log).toEqual(['mobile Login'])
    await expect(autoStep('Given user clicks "Home"', { page: 'page' })).rejects.toThrow(
      'No HomePage object for step'
    )
  })
})

describe('autoStep - Markdown steps and definitions without code', () => {
  it('should take a Markdown title as the step text, keyword-like first word included', async () => {
    Given('Open Home Page', async ({ page }) => {
      calls.push(`home ${page}`)
    })
    Given('Given flags are set', async () => {
      calls.push('flags')
    })

    await autoStep('Open Home Page', { page: 'page' })
    await autoStep('Given flags are set', {}, { keyword: false })

    expect(calls).toEqual(['home page', 'flags'])
    expect(runner.state.steps.map((step) => step.title)).toEqual([
      'Open Home Page',
      'Given flags are set'
    ])
  })

  it('should refuse a definition without code - its step is manual in generated tests', async () => {
    Given('todo step', async () => {
      // TODO: implement step
    })

    await expect(autoStep('Given todo step')).rejects.toThrow(
      /Step definition at src\/framework\/bdd\/runtime\.test\.ts:\d+ has no code/
    )
  })
})

describe('runHook', () => {
  it('should give Before hooks the context only when they ask for it', async () => {
    let tags: readonly string[] = []
    Before({ name: 'Tags' }, async ({ bdd }) => {
      tags = bdd.tags
    })

    await runHook('Before', 'Tags')

    expect(tags).toEqual(['@ui'])
  })
})
