/* eslint-disable no-console */
import { printErrorGroups } from './console-formatter'
import { getIcon } from './icons'
import type { ValidatorResult } from './sync-validator'

/**
 * Report validation errors and exit if any critical errors found
 */
export function reportValidationErrors(result: ValidatorResult): void {
  if (!result.success) {
    // Report duplicate base names
    if (result.errors.duplicateBaseNames) {
      console.error(`${getIcon('error')}  ${result.errors.duplicateBaseNames}`)
      process.exit(1)
    }

    // Report global ID/title errors
    if (result.errors.globalIDs && result.errors.globalIDs.length > 0) {
      console.log(`${getIcon('error')}  Duplicate IDs or titles found across MD files\n`)
      printErrorGroups(
        result.errors.globalIDs.map((err) => ({ title: err })),
        {
          fixMessageInside: 'Fix: Ensure Suite/Test Case/Step IDs and titles are unique'
        }
      )
      console.log()
      process.exit(1)
    }

    // Report MD structure errors
    if (result.errors.mdStructure && result.errors.mdStructure.length > 0) {
      console.log(
        `${getIcon('error')}  Invalid MD structure: ${result.errors.mdStructure.length} file(s)\n`
      )
      printErrorGroups(
        result.errors.mdStructure.map((mdError) => ({
          title: `MD File: ${mdError.file}`,
          errors: mdError.errors
        })),
        { fixMessageInside: 'Fix: Correct MD structure to match expected format' }
      )
      console.log()
      process.exit(1)
    }

    // Report validation failures
    if (result.errors.validationFailures && result.errors.validationFailures.length > 0) {
      console.log(
        `${getIcon('error')}  Failed: ${result.errors.validationFailures.length} file(s)\n`
      )

      // Categorize errors by what can fix them
      const hasTagErrors = result.errors.validationFailures.some((f) =>
        f.errors.some((err) => err.includes('Tag Problems:'))
      )
      const hasUnexpectedIdErrors = result.errors.validationFailures.some((f) =>
        f.errors.some((err) => err.includes('Unexpected ID') || err.includes('Unexpected Suite ID'))
      )
      const hasStageFixableErrors = result.errors.validationFailures.some((f) =>
        f.errors.some(
          (err) =>
            !err.includes('Tag Problems:') &&
            !err.includes('Unexpected ID') &&
            !err.includes('Unexpected Suite ID')
        )
      )

      // Determine fix message based on error types
      const manualFixes: string[] = []
      if (hasTagErrors) manualFixes.push('tags')
      if (hasUnexpectedIdErrors) manualFixes.push('IDs')

      const fixMessage =
        manualFixes.length > 0 && hasStageFixableErrors
          ? `Fix: npm run stage (structure), ${manualFixes.join(' and ')} manually`
          : manualFixes.length > 0
            ? `Fix ${manualFixes.join(' and ')} manually (stage does not fix these)`
            : 'Fix: npm run stage'

      printErrorGroups(
        result.errors.validationFailures.map((validationError) => ({
          title: `File: ${validationError.file}`,
          errors: validationError.errors
        })),
        { fixMessageAfter: fixMessage }
      )
      console.log()
      process.exit(1)
    }
  }
}
