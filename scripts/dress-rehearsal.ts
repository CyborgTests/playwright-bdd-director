/* eslint-disable no-console */
import { buildBddTests, isBddTestOutdated } from '@/framework/bdd/sync'
import { printErrorGroups } from '@/framework/reporting/console-formatter'
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'
import { reportValidationErrors } from '@/framework/validation/reporter'
import { validate } from '@/framework/validation/sync-validator'

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Dress Rehearsal - validate existing tests without modification
 * Checks that all test files sync with their markdown files and that generated tests of step
 * definitions style specs are up to date
 * Does NOT generate files, does NOT auto-fix
 */
async function main() {
  console.log(`${getIcon('start')}  Dress rehearsal in progress...\n`)

  const result = validate()

  reportValidationErrors(result)

  const bdd = await buildBddTests(result.markdownFiles)
  const failures = [
    ...bdd.errors.map(({ file, errors }) => ({ title: `Spec: ${file}`, errors })),
    ...bdd.generations.filter(isBddTestOutdated).map((g) => ({
      title: `File: ${g.testPath}`,
      errors: [`Outdated or missing generated test`]
    })),
    ...bdd.staleFiles.map((file) => ({
      title: `File: ${file}`,
      errors: ['Generated test without step definitions style spec']
    }))
  ]
  if (failures.length > 0) {
    console.log(`${getIcon('error')}  BDD tests failed: ${failures.length} file(s)\n`)
    printErrorGroups(failures, { fixMessageAfter: 'Fix: npm run stage' })
    process.exit(1)
  }

  const missing = bdd.generations.reduce((sum, g) => sum + g.missing.length, 0)
  if (missing > 0) {
    console.log(
      `${getIcon('warning')}  ${missing} step(s) without definition - their scenarios are fixme; npm run stage prints snippets\n`
    )
  }

  const total = result.validationResults.length + bdd.generations.length
  console.log(`${getIcon('success')}  All ${total} file(s) ready for the show!\n`)
  process.exit(0)
}
