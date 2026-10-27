/* eslint-disable no-console */
import { findSpecFiles } from '@/framework/bdd/build'
import { checkSpecRename, renameSpec } from '@/framework/core/spec-rename'
import { getErrorMessage, getMarkdownBaseName, getSuiteKey } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * Rename - give a spec a new name: `npm run rename auth login` turns auth.md into login.md and
 * src/steps/auth.steps.ts into login.steps.ts. All or nothing: a name taken by a spec (either
 * format) or a step file stops it. The suite tag follows the name (@auth → @login); step files
 * naming the old tag are listed for the author to check.
 */
function main() {
  const args = process.argv.slice(2)
  const check = args.includes('--check') // only whether the name is free - nothing changes
  const [suite, newName] = args.filter((arg) => arg !== '--check')
  if (!suite || !newName) {
    console.error(
      `${getIcon('error')}  Usage: npm run rename <suite> <new-name> [--check], e.g. npm run rename auth login`
    )
    process.exit(1)
  }

  const specs = findSpecFiles()
  const specPath = specs.find(
    (spec) => getMarkdownBaseName(spec) === suite || getSuiteKey(spec) === suite
  )
  if (!specPath) {
    const known = specs.map((spec) => getMarkdownBaseName(spec)).join(', ')
    throw new Error(`Unknown suite "${suite}" - specs: ${known}`)
  }

  const oldBase = getMarkdownBaseName(specPath)
  if (check) {
    checkSpecRename(specPath, newName, specs)
    console.log(`${getIcon('success')}  "${newName}" is free for ${oldBase} and its step file`)
    return
  }
  const renamed = renameSpec(specPath, newName, specs)
  console.log(`${getIcon('fix')}  ${renamed.spec.from} → ${renamed.spec.to}`)
  if (renamed.steps) console.log(`${getIcon('fix')}  ${renamed.steps.from} → ${renamed.steps.to}`)
  console.log(`    Suite tag: @${oldBase} → @${newName} (npm run play ${newName})`)
  if (renamed.tagUses.length > 0) {
    console.log(
      `\n${getIcon('warning')}  Step files still name @${oldBase} - hooks with it no longer run for this suite:`
    )
    renamed.tagUses.forEach((use) => console.log(`    • ${use}`))
  }
  console.log(`\n${getIcon('info')}  Check specs and step definitions: npm run dress\n`)
}
