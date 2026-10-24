import { spawn, spawnSync } from 'child_process'
import fs from 'fs'

import { CONFIG } from '../config'

const GENERATE = [require.resolve('tsx/cli'), 'scripts/generate-tests.ts']
const WATCH_DELAY_MS = 300

/**
 * Generate the tests from the specs before Playwright collects them - called by
 * playwright.config.ts, so every run (CLI, UI mode, IDE) gets tests of the current specs and step
 * definitions. Runs in a child process: generation is async and loads the step files, the config
 * must stay sync and keep its module cache clean. Workers load the config too - they skip it.
 * UI mode and IDE test servers load the config once, so they also regenerate on every change of
 * specs or source; Playwright picks up the changed test files itself.
 * @throws Error with the generation output - invalid specs, ambiguous steps, missing layers
 */
export function prepareTests(): void {
  if (process.env.TEST_WORKER_INDEX !== undefined) return
  const result = spawnSync(process.execPath, GENERATE, { encoding: 'utf-8' })
  if (result.status !== 0) {
    throw new Error(
      `Tests not generated\n${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`
    )
  }
  if (isTestServer()) watchSources()
}

/** `playwright test --ui` and the server IDE extensions start (`playwright test-server`) */
function isTestServer(): boolean {
  return process.argv.some((arg) => arg === 'test-server' || /^--ui(-host|-port)?(=|$)/.test(arg))
}

function watchSources(): void {
  let timer: NodeJS.Timeout | undefined
  let running = false
  let pending = false
  const generate = () => {
    if (running) {
      pending = true
      return
    }
    running = true
    const child = spawn(process.execPath, GENERATE, { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('close', (code) => {
      // The previous tests stay until the specs are valid again
      if (code !== 0) process.stderr.write(`Tests not generated\n${output}`)
      running = false
      if (pending) {
        pending = false
        generate()
      }
    })
  }
  for (const dir of [CONFIG.paths.testSuites, 'src']) {
    if (!fs.existsSync(dir)) continue
    try {
      fs.watch(dir, { recursive: true }, (_event, file) => {
        // Framework unit tests live next to the modules and do not change generated tests
        if (file?.endsWith('.test.ts')) return
        clearTimeout(timer)
        timer = setTimeout(generate, WATCH_DELAY_MS)
      }).unref()
    } catch {
      // Recursive watch needs Node 20 on Linux - without it tests follow the specs on restart
      process.stderr.write(`Not watching ${dir}: restart to pick up spec changes\n`)
    }
  }
}
