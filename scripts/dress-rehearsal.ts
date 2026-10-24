/* eslint-disable no-console */
import path from 'path'

import { buildTests } from '@/framework/bdd/build'
import { printErrorGroups } from '@/framework/reporting/console-formatter'
import { getErrorMessage, getMarkdownBaseName } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Dress Rehearsal - read-only check of specs and step definitions: what would stop a run (invalid
 * specs, missing layers, ambiguous steps) and what a person still walks (steps without step
 * definition or with one without code), plus step definitions no spec uses. Writes nothing.
 */
async function main() {
  console.log(`${getIcon('start')}  Dress rehearsal in progress...\n`)

  const { generations, errors, unused } = await buildTests()

  for (const generation of generations) {
    const manual = [
      ...generation.missing.map((step) => step.title),
      ...generation.pending.map((step) => `${step.title} (no code: ${step.location})`)
    ]
    if (manual.length === 0) continue
    console.log(
      `${getIcon('warning')}  ${toPosix(generation.specPath)}: ${manual.length} step(s) walked by a person`
    )
    manual.forEach((title) => console.log(`    • ${title}`))
    const fixme = generation.tests.filter((test) => test.fixme)
    if (fixme.length > 0) {
      console.log(`    ${fixme.length} API test(s) stay fixme until all their steps are automated`)
    }
    if (generation.missing.length > 0) {
      console.log(
        `    ${getIcon('info')}  Skeletons: npm run steps ${getMarkdownBaseName(generation.specPath)}`
      )
    }
    console.log('')
  }

  if (unused.length > 0) {
    console.log(`${getIcon('warning')}  ${unused.length} step definition(s) no spec uses:`)
    unused.forEach((definition) =>
      console.log(`    • ${String(definition.pattern)} - ${definition.location}`)
    )
    console.log('')
  }

  if (errors.length > 0) {
    console.log(`${getIcon('error')}  Not ready for the show: ${errors.length} file(s)\n`)
    printErrorGroups(
      errors.map(({ file, errors: messages }) => ({ title: `Spec: ${file}`, errors: messages })),
      { fixMessageAfter: 'Tests are generated on every run - fix the specs or step definitions' }
    )
    process.exit(1)
  }

  const tests = generations.flatMap((generation) => generation.tests)
  const count = (predicate: (test: (typeof tests)[number]) => boolean) =>
    tests.filter(predicate).length
  console.log(
    `${getIcon('success')}  ${generations.length} spec(s) ready for the show: ${tests.length} tests - ` +
      `${count((t) => t.kind === 'auto' && !t.fixme)} auto, ${count((t) => t.kind === 'cyborg')} cyborg, ` +
      `${count((t) => t.fixme)} fixme\n`
  )
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
