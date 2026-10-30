/* eslint-disable no-console */
import fs from 'fs'

import { buildTests, writeTests } from '@/framework/bdd/build'
import { GENERATION_PROGRESS, PROGRESS_FD } from '@/framework/bdd/prepare'
import { printSpecErrors } from '@/framework/reporting/console-formatter'
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

// An unexpected failure keeps its stack: the console drops it, the generation errors file keeps it
main().catch((error: unknown) => {
  console.error(
    `${getIcon('error')}  `,
    error instanceof Error ? error.stack : getErrorMessage(error)
  )
  process.exit(1)
})

/**
 * Generate the tests of every spec into CONFIG.paths.generatedTests - run by playwright.config.ts
 * before each run (see prepareTests). Prints only problems: nothing is written while a spec is
 * invalid, the run stops with them. Progress goes to its own channel, which prepareTests opens.
 */
async function main() {
  const { generations, errors } = await buildTests(undefined, reportProgress)
  if (errors.length > 0) {
    printSpecErrors(errors, 'Fix the specs or step definitions - npm run dress shows everything')
    process.exit(1)
  }
  writeTests(generations)
}

/** A terminal line rewritten in place, or a line per spec for the server that shows it in the UI */
function reportProgress(done: number, total: number): void {
  const mode = process.env[GENERATION_PROGRESS]
  if (mode === 'terminal') {
    const end = done === total ? '\n' : ''
    fs.writeSync(PROGRESS_FD, `\rGenerating tests: ${done} / ${total}${end}`)
  } else if (mode === 'lines') {
    fs.writeSync(PROGRESS_FD, `${done}/${total}\n`)
  }
}
