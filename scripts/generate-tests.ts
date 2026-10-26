/* eslint-disable no-console */
import { buildTests, writeTests } from '@/framework/bdd/build'
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
 * invalid, the run stops with them.
 */
async function main() {
  const { generations, errors } = await buildTests()
  if (errors.length > 0) {
    printSpecErrors(errors, 'Fix the specs or step definitions - npm run dress shows everything')
    process.exit(1)
  }
  writeTests(generations)
}
