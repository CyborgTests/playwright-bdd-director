import { test } from '@playwright/test'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const child = vi.hoisted(() => ({
  spawnSync: vi.fn(),
  spawn: vi.fn()
}))

// CONFIG reads it on import - failed generation must not write into the repo's test-results
const errorsFile = vi.hoisted(() => {
  const file = `${process.env.TEMP ?? process.env.TMPDIR ?? '/tmp'}/director-${process.pid}/generation-errors.md`
  process.env.GENERATION_ERRORS_FILE = file
  return file
})

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
const { prepareTests, renderGenerationErrors, withoutStack } =
  await import('@/framework/bdd/prepare')
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
    const cart = write('shop/cart.md', '@ui\n## Cart\n\n### Open\n\n#### Open Cart\n')
    const noLayer = write('pay.md', '## Pay\n\n### Pay\n\n#### Pay\n')
    const broken = write('broken.md', 'text before any heading\n')
    const twin = write('shop/twin.md', '@ui\n## Twin\n\n### A\n\n#### Open Cart\n')
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

  it('should leave generation to test server watching sources', () => {
    vi.stubEnv('DIRECTOR_TESTS_WATCHED', '1')

    prepareTests()

    expect(child.spawnSync).not.toHaveBeenCalled()
  })

  it('should generate in a child process and stop a CLI run with its output on failure', () => {
    vi.stubEnv('TEST_WORKER_INDEX', undefined)
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`)
    })
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    child.spawnSync.mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })
    child.spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'Test "Pay" has no layer\n',
      stderr: 'Error: Cannot find module\n    at load (src/steps/cart.steps.ts:3:1)\n'
    })

    prepareTests()
    expect(fs.existsSync(errorsFile)).toBe(false)
    expect(() => prepareTests()).toThrow('exit 1')

    expect(child.spawnSync.mock.calls[0][1]).toEqual([
      expect.stringMatching(/tsx/),
      'scripts/generate-tests.ts'
    ])
    expect(stderr).toHaveBeenCalledWith(
      `Tests not generated\nTest "Pay" has no layer\nError: Cannot find module\n  Full output with stack traces: ${errorsFile.replace(/\\/g, '/')}\n`
    )
    const report = fs.readFileSync(errorsFile, 'utf-8')
    expect(report).toContain('    at load (src/steps/cart.steps.ts:3:1)')
    expect(report).toContain('## Stack trace\n\n```text\nError: Tests not generated\n    at ')
    exit.mockRestore()
    stderr.mockRestore()
  })

  it('should throw the output without a stack in a test server - it must stay up', () => {
    vi.stubEnv('TEST_WORKER_INDEX', undefined)
    const argv = process.argv
    process.argv = [...argv, 'test-server']
    child.spawnSync.mockReturnValueOnce({
      status: 1,
      stdout: 'Test "Pay" has no layer\n',
      stderr: ''
    })

    try {
      expect(() => prepareTests()).toThrow(
        expect.objectContaining({
          stack: expect.stringMatching(/^Error: Tests not generated\n[^]*md\n$/)
        })
      )
    } finally {
      process.argv = argv
    }
  })
})

describe('withoutStack', () => {
  it('should drop the frames of stack traces and keep everything else', () => {
    expect(
      withoutStack('Spec: a.md\n  Fix: tag it\nError: boom\n    at x (a.ts:1:1)\n\tat y\n')
    ).toBe('Spec: a.md\n  Fix: tag it\nError: boom')
  })
})

describe('renderGenerationErrors', () => {
  it('should render the output and the stack as text blocks', () => {
    expect(renderGenerationErrors('No layer\n', 'Error: x\n    at y')).toBe(
      '# Tests not generated\n\n## Generation output\n\n```text\nNo layer\n```\n\n## Stack trace\n\n```text\nError: x\n    at y\n```\n'
    )
  })

  it('should leave out the stack section without a stack', () => {
    expect(renderGenerationErrors('No layer', '')).not.toContain('## Stack trace')
  })
})
