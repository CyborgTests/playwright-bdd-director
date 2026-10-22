import { test, type TestType } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { clearStepDefinitions, createBdd } from '@/framework/bdd/registry'
import { checkRunSteps } from '@/framework/bdd/run-step-check'
import { resetSharedProject } from '@/framework/utils/ts-morph-helpers'

const { Given, Then, When } = createBdd(
  test as unknown as TestType<{ homePage: unknown; loginPage: unknown }, object>
)
const load = async () => {}
let testDir: string

beforeEach(() => {
  clearStepDefinitions()
  resetSharedProject()
  testDir = path.join(process.cwd(), `.test-tmp-run-step-${crypto.randomBytes(4).toString('hex')}`)
  fs.mkdirSync(testDir, { recursive: true })
  Given('user opens the home page', async ({ homePage }) => homePage)
  When('user clicks {string} button', async ({ homePage }) => homePage)
  Then('{string} form is visible', async ({ loginPage }) => loginPage)
})

afterEach(() => {
  clearStepDefinitions()
  resetSharedProject()
  fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

/** Cyborg test importing runStep and this file's step definitions, with the given test body */
const check = (
  body: string,
  imports = "import '../tests/unit/run-step-check.test'\n",
  specs?: ReadonlyMap<string, string>
) => {
  const file = path.join(testDir, 'shop.cyborg.test.ts')
  fs.writeFileSync(
    file,
    `${imports}import { test } from '@/fixtures/base.fixture'
import { runStep } from '@/framework/bdd'

test.describe('[CYBORG] Shop', () => {
${body}
})
`,
    'utf-8'
  )
  return checkRunSteps([file], { load, specs }).then((result) => result[0]?.errors ?? [])
}

describe('checkRunSteps', () => {
  it('should accept steps with fixtures passed and declared, examples templates', async () => {
    const errors = await check(`  test('Open', async ({ homePage, loginPage, manualStep }) => {
    await runStep('Given user opens the home page', { homePage })
    await manualStep('When user waits')
  })

  for (const example of [{ form: 'Login' }, { form: 'Signup' }]) {
    test(\`See \${example.form}\`, async ({ authenticatedUser }) => {
      const { loginPage } = authenticatedUser
      await runStep(\`Then "\${example.form}" form is visible\`, { loginPage })
    })
  }`)

    expect(errors).toEqual([])
  })

  it('should skip files without runStep and generated tests', async () => {
    const file = path.join(testDir, 'plain.cyborg.test.ts')
    fs.writeFileSync(file, "test('A', async ({ manualStep }) => manualStep('B'))", 'utf-8')

    expect(
      await checkRunSteps([file, 'tests/bdd/header-navigation.bdd.test.ts'], { load })
    ).toEqual([])
  })

  it('should give exact fix for missing and non-literal fixtures', async () => {
    const errors = await check(`  test('Open', async ({ homePage }) => {
    await runStep('Given user opens the home page')
    await runStep('When user clicks "Home" button', fixtures)
  })`)

    expect(errors[0]).toContain(
      "runStep('Given user opens the home page') needs fixtures: homePage\n  Fix: await runStep('Given user opens the home page', { homePage })"
    )
    expect(errors[1]).toContain('fixtures of runStep must be an object literal')
  })

  it('should report fixtures not declared in the test', async () => {
    const errors = await check(`  test('Open', async ({ manualStep }) => {
    await runStep('Given user opens the home page', { homePage })
  })`)

    expect(errors).toEqual([
      expect.stringContaining(
        'homePage not declared in the test\n  Fix: Add to the test parameters: async ({ homePage, ... }) =>'
      )
    ])
  })

  it('should report missing, ambiguous and unresolvable steps', async () => {
    When('user clicks {word} button', async () => {})
    const errors = await check(`  test('Open', async ({ homePage, step }) => {
    await runStep('Then cart is empty')
    await runStep('When user clicks "Home" button', { homePage })
    await runStep(step)
  })`)

    expect(errors[0]).toContain('no step definition matches "Then cart is empty"')
    expect(errors[1]).toContain('Ambiguous step "When user clicks "Home" button" matches 2')
    expect(errors[2]).toContain('runStep title cannot be checked')
  })

  it('should report runStep wrapped in test.step of the same title', async () => {
    const errors = await check(`  test('Open', async ({ homePage }) => {
    await test.step('Given user opens the home page', async () => {
      await runStep('Given user opens the home page', { homePage })
    })
  })`)

    expect(errors).toEqual([expect.stringContaining('the step is reported twice')])
  })

  it('should require runStep and step file imports', async () => {
    const errors = await check(
      `  test('Open', async ({ homePage }) => {
    await runStep('Given user opens the home page', { homePage })
  })`,
      ''
    )

    expect(errors).toEqual([
      expect.stringContaining(
        'Step definitions of tests/unit/run-step-check.test.ts are used but not imported\n  Fix: import'
      )
    ])
  })
})

describe('checkRunSteps - languages', () => {
  const body = `  test('Open', async ({ homePage }) => {
    await runStep('Дано user opens the home page', { homePage }, { language: 'uk' })
    await runStep('Дано user opens the home page', { homePage })
  })`

  it('should match a non-English title with its language, hint the language of the spec', async () => {
    const spec = path.join(testDir, 'shop.feature')
    fs.writeFileSync(spec, '# language: uk\nФункціонал: Shop\n  Сценарій: Open\n    Дано x\n')

    const errors = await check(body, undefined, new Map([['shop', spec]]))

    expect(errors).toEqual([
      expect.stringContaining(
        "no step definition matches \"Дано user opens the home page\"\n  Fix: Pass the spec language: runStep('Дано user opens the home page', { ... }, { language: 'uk' })"
      )
    ])
  })

  it('should give a generic language hint when the spec is unknown', async () => {
    const errors = await check(body)

    expect(errors).toEqual([
      expect.stringContaining(
        "(its # language: code): runStep('Дано user opens the home page', { ... }, { language: '<code>' })"
      )
    ])
  })
})
