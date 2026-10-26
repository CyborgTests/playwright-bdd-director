import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { CONFIG } from '../config'
import { toPosix } from '../utils/helpers'

const GENERATE = [require.resolve('tsx/cli'), 'scripts/generate-tests.ts']
const WATCH_DELAY_MS = 300

/**
 * Generate the tests from the specs before Playwright collects them - called by
 * playwright.config.ts, so every run (CLI, UI mode, IDE) gets tests of the current specs and step
 * definitions. Runs in a child process: generation is async and loads the step files, the config
 * must stay sync and keep its module cache clean. Workers load the config too - they skip it.
 * UI mode and IDE test servers load the config once, so they also regenerate on every change of
 * specs or source; Playwright picks up the changed test files itself.
 * Failed generation (invalid specs, ambiguous steps, missing layers) stops a CLI run with exit
 * code 1 and its output; stack traces go to CONFIG.paths.generationErrors only.
 * @throws Error with the generation output in UI mode and IDE test servers - they must stay up
 */
export function prepareTests(): void {
  if (process.env.TEST_WORKER_INDEX !== undefined) return
  const result = spawnSync(process.execPath, GENERATE, { encoding: 'utf-8' })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`
    const message = reportFailure(output, new Error('Tests not generated').stack)
    if (isTestServer()) {
      const error = new Error(message)
      error.stack = `Error: ${message}`
      throw error
    }
    // A thrown error would come with the config load stack, printed by Node as [Error: …]
    process.stderr.write(message)
    process.exit(1)
  }
  fs.rmSync(CONFIG.paths.generationErrors, { force: true })
  if (isTestServer()) watchSources()
}

/**
 * Write the full generation output to CONFIG.paths.generationErrors
 * @returns the console message: the output without stack traces and the link to the file
 */
function reportFailure(output: string, stack = ''): string {
  const file = CONFIG.paths.generationErrors
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, renderGenerationErrors(output, stack))
  return `Tests not generated\n${withoutStack(output)}\n  Full output with stack traces: ${toPosix(file)}\n`
}

/** Generation output, then the stack of the config load it stopped */
export function renderGenerationErrors(output: string, stack: string): string {
  const sections = [
    `# Tests not generated\n\n## Generation output\n\n\`\`\`text\n${output.trimEnd()}\n\`\`\``
  ]
  if (stack) sections.push(`## Stack trace\n\n\`\`\`text\n${stack.trimEnd()}\n\`\`\``)
  return `${sections.join('\n\n')}\n`
}

/** Text without the `    at …` lines of stack traces */
export function withoutStack(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s+at\s/.test(line))
    .join('\n')
    .trimEnd()
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
      if (code !== 0) process.stderr.write(reportFailure(output))
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
