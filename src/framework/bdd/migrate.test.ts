import path from 'path'
import { describe, expect, it } from 'vitest'

import { escapeExpression, migratePlaywrightTest } from '@/framework/bdd/migrate'

const options = {
  sourcePath: path.join('tests', 'login.spec.ts'),
  suite: 'login',
  stepsDir: path.join('src', 'steps')
}

const LOGIN = `import { expect, test } from '@playwright/test'
import { LoginPage } from '../src/pages/LoginPage'
import { unused } from './helpers'

const user = { email: 'a@b.c' }

test.describe('Login', { tag: '@auth' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('valid user logs in', { tag: ['@smoke'] }, async ({ page }) => {
    await test.step('Open login (signup) page', async () => {
      await new LoginPage(page).open()
    })
    await test.step('Log in', async () => {
      await page.fill('#email', user.email)
      await expect(page).toHaveURL(/account/)
    })
  })

  test.fixme('reset password', async ({ page }) => {
    await test.step('Open login (signup) page', async () => {
      await new LoginPage(page).open()
    })
  })
})
`

describe('migratePlaywrightTest', () => {
  it('should turn describe, tests and steps into a spec and step definitions', () => {
    const migrated = migratePlaywrightTest(LOGIN, options)

    expect(migrated.markdown).toBe(
      [
        '@ui @auth',
        '## Login',
        '',
        '---',
        '',
        '@smoke',
        '### valid user logs in',
        '#### Open login (signup) page',
        '#### Log in',
        '',
        '---',
        '',
        '@fixme',
        '### reset password',
        '#### Open login (signup) page',
        ''
      ].join('\n')
    )
    expect(migrated).toMatchObject({ tests: 2, stepDefinitions: 2, warnings: [] })
    expect(migrated.steps).toContain("import { expect } from '@playwright/test'")
    expect(migrated.steps).toContain("import { LoginPage } from '../pages/LoginPage'")
    expect(migrated.steps).not.toContain('unused')
    expect(migrated.steps).toContain("import { Before, Step } from './bdd'")
    expect(migrated.steps).toContain("const user = { email: 'a@b.c' }")
    expect(migrated.steps).toContain("Before({ tags: '@login' }, async ({ page }) => {")
    expect(migrated.steps).toContain(
      "Step('Open login \\\\(signup\\\\) page', async ({ page }) => {\nawait new LoginPage(page).open()\n})"
    )
  })

  it('should give API tests the API layer and warn about fixtures of another module', () => {
    const migrated = migratePlaywrightTest(
      `import { test } from '../fixtures'
test('lists products', async ({ request }) => {
  await test.step('Get products', async () => {
    await request.get('/api/productsList')
  })
})`,
      options
    )

    expect(migrated.markdown).toContain('@api\n## login\n')
    expect(migrated.warnings[0]).toContain('take `test` from ../fixtures')
  })

  it('should list every line that cannot be migrated', () => {
    const migrate = () =>
      migratePlaywrightTest(
        `import { test } from '@playwright/test'
test.use({ viewport: null })
test.describe('A', () => {
  test.describe('B', () => {})
  test('flat', async ({ page }) => {
    await page.goto('/')
  })
  test('one', async ({ page }) => {
    await test.step('Open', async () => { await page.goto('/') })
  })
  test('two', async ({ page }) => {
    await test.step('Open', async () => { await page.goto('/home') })
  })
  test('existing', async ({ page }) => {
    await test.step('Taken', async () => { await page.goto('/') })
  })
})`,
        {
          ...options,
          matchExisting: (text) => (text === 'Taken' ? 'src/steps/x.steps.ts:3' : undefined)
        }
      )

    expect(migrate).toThrow(
      [
        'tests/login.spec.ts cannot be migrated:',
        '  - line 2: test.use() has no place in a spec - set it in playwright.config.ts or a step',
        '  - line 4: a describe inside a describe - a spec has one level of test cases',
        '  - line 6: "flat": code outside test.step - await page.goto(\'/\')',
        '  - line 12: step "Open" has other code at line 9 - one step text, one code',
        '  - line 15: step "Taken" matches the step definition at src/steps/x.steps.ts:3'
      ].join('\n')
    )
  })
})

describe('escapeExpression', () => {
  it('should keep Cucumber expression syntax literal', () => {
    expect(escapeExpression('Open {x} (a/b) \\ page')).toBe('Open \\{x\\} \\(a\\/b\\) \\\\ page')
  })
})
