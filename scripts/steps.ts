/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import prettier from 'prettier'

import { buildTests } from '@/framework/bdd/build'
import { addStepSkeletons } from '@/framework/bdd/skeletons'
import { CONFIG } from '@/framework/config'
import { printErrorGroups } from '@/framework/reporting/console-formatter'
import { getErrorMessage, getMarkdownBaseName, getSuiteKey } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Step definition skeletons for the steps of suites that have no step definition:
 * `npm run steps auth navigation` appends them to src/steps/<suite>.steps.ts. A skeleton has no
 * code (`// TODO: implement step`), so its step stays manual until it is implemented.
 */
async function main() {
  const suites = process.argv.slice(2)
  if (suites.length === 0) {
    console.error(`${getIcon('error')}  Usage: npm run steps <suite...>, e.g. npm run steps auth`)
    process.exit(1)
  }

  const { generations, errors } = await buildTests()
  if (errors.length > 0) {
    console.log(`${getIcon('warning')}  Problems to fix as well (npm run dress):\n`)
    printErrorGroups(
      errors.map(({ file, errors: messages }) => ({ title: `Spec: ${file}`, errors: messages }))
    )
    console.log('')
  }

  for (const suite of suites) {
    const generation = generations.find(
      (g) => getMarkdownBaseName(g.specPath) === suite || getSuiteKey(g.specPath) === suite
    )
    if (!generation) {
      const known = generations.map((g) => getMarkdownBaseName(g.specPath)).join(', ')
      console.error(`${getIcon('error')}  Unknown suite "${suite}" - specs: ${known}`)
      process.exit(1)
    }
    if (generation.missing.length === 0) {
      console.log(`${getIcon('success')}  ${suite}: every step has a step definition`)
      continue
    }

    const file = path.join(
      CONFIG.bdd.stepsDir,
      `${getMarkdownBaseName(generation.specPath)}.steps.ts`
    )
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
    const { content, added } = addStepSkeletons(existing, generation.missing)
    const options = await prettier.resolveConfig(file)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, await prettier.format(content, { ...options, filepath: file }))
    console.log(
      `${getIcon('fix')}  ${file}: ${added} skeleton(s) - their steps stay manual until they have code`
    )
  }
}
