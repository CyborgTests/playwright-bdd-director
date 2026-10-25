/* eslint-disable no-console */
import { findSpecFiles } from '@/framework/bdd/build'
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'
import { autoFixMDFormatting } from '@/framework/validation/md-validator'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * Stage - format the Markdown specs as dense as Gherkin: heading and list spacing, a `---` separator
 * before every test case. Tests need no staging: they are generated from the specs on every run.
 */
function main() {
  console.log(`${getIcon('start')}  Director staging the play...\n`)

  const fixed = findSpecFiles()
    .filter((specPath) => specPath.endsWith('.md'))
    .filter((specPath) => autoFixMDFormatting(specPath))

  if (fixed.length > 0) {
    console.log(`${getIcon('fix')}  Formatted:`)
    fixed.forEach((file) => console.log(`    • ${file}`))
  } else {
    console.log(`${getIcon('success')}  All specs are formatted`)
  }
  console.log(`\n${getIcon('info')}  Check specs and step definitions: npm run dress\n`)
}
