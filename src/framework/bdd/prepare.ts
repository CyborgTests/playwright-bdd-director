import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { CONFIG } from '../config'
import { toPosix } from '../utils/helpers'

// tsx as a loader: its CLI starts one more process, which would not get the progress channel
const GENERATE = ['--import', 'tsx', 'scripts/generate-tests.ts']
const WATCH_DELAY_MS = 300
const LOCK_POLL_MS = 100
const UI_UPDATE_MS = 250
const PROGRESS_TAIL = 64 // characters of the channel kept: more than two lines
/**
 * Set by a test server once it watches the sources, its loader processes inherit it: the path of a
 * file that exists while the tests are being regenerated
 */
const TESTS_WATCHED = 'DIRECTOR_TESTS_WATCHED'
/** How the generation child reports progress: `terminal` or `lines`, none - silent */
export const GENERATION_PROGRESS = 'DIRECTOR_GENERATION_PROGRESS'
/** Extra stdio channel of the child: a sync spawn gives stdout and stderr only when it ends */
export const PROGRESS_FD = 3

/**
 * Generate the tests from the specs before Playwright collects them - called by
 * playwright.config.ts, so every run (CLI, UI mode, IDE) gets tests of the current specs and step
 * definitions. Runs in a child process: generation is async and loads the step files, the config
 * must stay sync and keep its module cache clean. Workers load the config too - they skip it.
 * UI mode and IDE test servers generate once on start, then on every change of specs or source;
 * the loader processes they start for each list and run reload the config and skip generation,
 * waiting for one in progress - Playwright picks up the changed test files itself.
 * A person sees that generation runs, not a silent pause: stderr in the console (stdout may carry a
 * reporter's JSON), the Director Output panel for a regeneration.
 * Failed generation (invalid specs, ambiguous steps, missing layers) stops a CLI run with exit
 * code 1 and its output; stack traces go to CONFIG.paths.generationErrors only.
 * @throws Error with the generation output in UI mode and IDE test servers - they must stay up
 */
export function prepareTests(): void {
  if (process.env.TEST_WORKER_INDEX !== undefined) return
  const lock = process.env[TESTS_WATCHED]
  if (lock !== undefined) {
    waitWhileExists(lock)
    return
  }
  const startedAt = Date.now()
  const terminal = process.stderr.isTTY === true
  process.stderr.write(`Generating tests...${terminal ? '' : '\n'}`)
  const result = spawnSync(process.execPath, GENERATE, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe', 2],
    env: { ...process.env, ...(terminal ? { [GENERATION_PROGRESS]: 'terminal' } : {}) }
  })
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
  process.stderr.write(`Generated tests in ${secondsSince(startedAt)} s\n`)
  if (isTestServer()) {
    // Own folder: a fixed name in the shared temp folder could be someone else's link
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'director-'))
    const generating = path.join(folder, 'generating')
    watchSources(generating)
    process.env[TESTS_WATCHED] = generating
    process.on('exit', () => fs.rmSync(folder, { recursive: true, force: true }))
  }
}

function waitWhileExists(file: string): void {
  const sleeper = new Int32Array(new SharedArrayBuffer(4))
  while (fs.existsSync(file)) Atomics.wait(sleeper, 0, 0, LOCK_POLL_MS)
}

function secondsSince(startedAt: number): string {
  return ((Date.now() - startedAt) / 1000).toFixed(1)
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

/** Last whole `done/total` line - a chunk of the channel may end in the middle of one */
export function lastProgress(reported: string): { done: number; total: number } | undefined {
  const last = [...reported.matchAll(/(?:^|\n)(\d+)\/(\d+)(?=\n)/g)].at(-1)
  return last ? { done: Number(last[1]), total: Number(last[2]) } : undefined
}

/** Regeneration as the Director Output panel shows it; the server exists in UI mode only */
function notifyUi(event: { done: number; total: number } | { seconds: string; failed: boolean }) {
  const { directorBroadcast } = globalThis as { directorBroadcast?: (message: unknown) => void }
  directorBroadcast?.({ type: 'GENERATION', data: event })
}

function watchSources(generating: string): void {
  let timer: NodeJS.Timeout | undefined
  let running = false
  let pending = false
  const generate = () => {
    if (running) {
      pending = true
      return
    }
    running = true
    const startedAt = Date.now()
    notifyUi({ done: 0, total: 0 })
    const child = spawn(process.execPath, GENERATE, {
      stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
      env: { ...process.env, [GENERATION_PROGRESS]: 'lines' }
    })
    let shownAt = 0
    let reported = ''
    child.stdio[PROGRESS_FD]?.on('data', (chunk: Buffer) => {
      reported = (reported + chunk.toString()).slice(-PROGRESS_TAIL)
      const progress = lastProgress(reported)
      if (!progress || Date.now() - shownAt < UI_UPDATE_MS) return
      shownAt = Date.now()
      notifyUi(progress)
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('close', (code) => {
      // The previous tests stay until the specs are valid again
      if (code !== 0) process.stderr.write(reportFailure(output))
      notifyUi({ seconds: secondsSince(startedAt), failed: code !== 0 })
      running = false
      if (pending) {
        pending = false
        generate()
      } else {
        fs.rmSync(generating, { force: true })
      }
    })
  }
  for (const dir of [CONFIG.paths.testSuites, 'src']) {
    if (!fs.existsSync(dir)) continue
    try {
      fs.watch(dir, { recursive: true }, (_event, file) => {
        // Framework unit tests live next to the modules and do not change generated tests
        if (file?.endsWith('.test.ts')) return
        fs.writeFileSync(generating, '') // before the delay: a run may start right after a save
        clearTimeout(timer)
        timer = setTimeout(generate, WATCH_DELAY_MS)
      }).unref()
    } catch {
      // Recursive watch needs Node 20 on Linux - without it tests follow the specs on restart
      process.stderr.write(`Not watching ${dir}: restart to pick up spec changes\n`)
    }
  }
}
