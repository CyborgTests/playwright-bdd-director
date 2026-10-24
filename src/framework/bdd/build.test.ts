import { test } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const child = vi.hoisted(() => ({
  spawnSync: vi.fn(),
  spawn: vi.fn()
}))

vi.mock('child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('child_process')>()),
  spawnSync: child.spawnSync,
  spawn: child.spawn
}))

// Step files of the repo are not loaded - each test defines its own steps
vi.mock('@/framework/bdd/generator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/framework/bdd/generator')>()),
  loadStepDefinitions: async () => {}
}))

const { buildTests, findSpecFiles } = await import('@/framework/bdd/build')
const { prepareTests } = await import('@/framework/bdd/prepare')
const { clearStepDefinitions, createBdd } = await import('@/framework/bdd/registry')

const { Step } = createBdd(test)
let suitesDir: string

beforeEach(() => {
  clearStepDefinitions()
  suitesDir = path.join(process.cwd(), `.test-tmp-build-${crypto.randomBytes(4).toString('hex')}`)
  fs.mkdirSync(path.join(suitesDir, 'shop'), { recursive: true })
})

afterEach(() => {
  clearStepDefinitions()
  vi.unstubAllEnvs()
  child.spawnSync.mockReset()
  fs.rmSync(suitesDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

const write = (relative: string, content: string) => {
  const file = path.join(suitesDir, relative)
  fs.writeFileSync(file, content, 'utf-8')
  return file
}

describe('buildTests', () => {
  it('should generate every valid spec and report invalid ones, duplicate names and unused steps', async () => {
    Step('Open Cart', async ({ page }) => page)
    Step('Never used', async ({ page }) => page)
    const cart = write('shop/cart.md', '## Cart\n\nTags: @ui\n\n### Open\n\n#### Open Cart\n')
    const noLayer = write('pay.md', '## Pay\n\n### Pay\n\n#### Pay\n')
    const broken = write('broken.md', 'text before any heading\n')
    const twin = write('shop/twin.md', '## Twin\n\nTags: @ui\n\n### A\n\n#### Open Cart\n')
    const twinFeature = write('twin.feature', '@ui\nFeature: Twin\n')

    const result = await buildTests(findSpecFiles(suitesDir))

    expect(result.generations.map((g) => g.specPath)).toEqual([noLayer, cart])
    expect(result.generations[1].tests[0]).toMatchObject({ title: 'Open', kind: 'auto' })
    expect(result.errors.map(({ file }) => file)).toEqual([
      [twin, twinFeature].sort().join(', '),
      broken,
      noLayer
    ])
    expect(result.errors[0].errors[0]).toContain('Several specs named "twin"')
    expect(result.errors[2].errors[0]).toContain('Test "Pay" has no layer')
    expect(result.unused.map((definition) => String(definition.pattern))).toEqual(['Never used'])
  })
})

describe('prepareTests', () => {
  it('should leave generation to the main process', () => {
    vi.stubEnv('TEST_WORKER_INDEX', '0')

    prepareTests()

    expect(child.spawnSync).not.toHaveBeenCalled()
  })

  it('should generate in a child process and stop the run with its output on failure', () => {
    vi.stubEnv('TEST_WORKER_INDEX', undefined)
    child.spawnSync.mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
    child.spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'Test "Pay" has no layer\n',
      stderr: ''
    })

    prepareTests()
    expect(() => prepareTests()).toThrow('Tests not generated\nTest "Pay" has no layer')
    expect(child.spawnSync.mock.calls[0][1]).toEqual([
      expect.stringMatching(/tsx/),
      'scripts/generate-tests.ts'
    ])
  })
})
