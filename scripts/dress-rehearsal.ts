/* eslint-disable no-console */
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'
import { reportValidationErrors } from '@/framework/validation/reporter'
import { validate } from '@/framework/validation/sync-validator'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * Dress Rehearsal - validate existing tests without modification
 * Checks that all test files sync with their markdown files
 * Does NOT generate files, does NOT auto-fix
 */
function main() {
  console.log(`${getIcon('start')}  Dress rehearsal in progress...\n`)

  const result = validate()

  reportValidationErrors(result)

  console.log(
    `${getIcon('success')}  All ${result.validationResults.length} file(s) ready for the show!\n`
  )
  process.exit(0)
}
