/* eslint-disable no-console */
import { findSpecFiles } from '@/framework/bdd/build'
import { loadStepDefinitions } from '@/framework/bdd/generator'
import { findAtLine, rewordStep, rewordTitle } from '@/framework/bdd/step-reword'
import { getErrorMessage, getMarkdownBaseName, getSuiteKey } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

const USAGE = `Usage: npm run reword -- [--check] "<old>" "<new>"
  <old>: the pattern of a step definition ("user adds {string} to cart") or the text of a manual step
  --check: only whether the new text fits - nothing changes
       npm run reword -- --at <suite> <line> "<new title>"   # suite / rule / test case title
       npm run reword -- --find <suite> <line>   # the step or title at a spec line, as JSON`

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Reword - change the text of a step everywhere: `npm run reword "user adds {string} to cart"
 * "user puts {string} in the cart"` changes the step definition pattern and every spec step it
 * matches, the parameter values stay; a manual step (no definition) changes in the specs only.
 * All or nothing: a step not found or a new text matching another step definition stops it.
 * `--at` gives a new title to the suite, a rule or a test case at a spec line (that line only).
 * Director UI: F2 or a double click on a step or title line (`--find` gives the text to edit).
 */
async function main() {
  const args = process.argv.slice(2)
  const end = args.includes('--') ? args.indexOf('--') : args.length // texts may start with "-"
  const flags = args.slice(0, end).filter((arg) => arg.startsWith('--'))
  const values = [
    ...args.slice(0, end).filter((arg) => !arg.startsWith('--')),
    ...args.slice(end + 1)
  ]
  await loadStepDefinitions()

  if (flags.includes('--find')) {
    const [suite, line] = values
    console.log(JSON.stringify(findAtLine(findSpec(suite), Number(line))))
    return
  }
  if (flags.includes('--at')) {
    const [suite, line, title] = values
    if (values.length !== 3 || !title) throw new Error(USAGE)
    const retitled = rewordTitle(findSpec(suite), Number(line), title)
    console.log(
      `${getIcon('fix')}  ${retitled.label}: "${retitled.from}" → "${retitled.to}" (${retitled.file})`
    )
    return
  }

  const [from, to] = values
  if (values.length !== 2 || !from || !to) throw new Error(USAGE)
  const check = flags.includes('--check')
  const reworded = rewordStep(from, to, findSpecFiles(), { check })

  const total = reworded.specs.reduce((sum, spec) => sum + spec.steps, 0)
  console.log(
    `${getIcon(check ? 'success' : 'fix')}  ${check ? 'Fits' : 'Reworded'}: "${reworded.from}" → "${reworded.to}"`
  )
  if (reworded.definition) console.log(`    • step definition ${reworded.definition}`)
  for (const spec of reworded.specs) {
    console.log(`    • ${spec.file}: ${spec.steps} step${spec.steps === 1 ? '' : 's'}`)
  }
  if (total === 0) console.log('    • no spec uses it yet')

  if (reworded.definition && !check) {
    console.log(
      `\n${getIcon('warning')}  The code of the step did not change - it still does what "${reworded.from}" said.\n` +
        `    Check that ${reworded.definition} does what "${reworded.to}" says before running the tests`
    )
  }
  if (reworded.automatedBy) {
    console.log(
      `\n${getIcon('warning')}  The step matches the step definition at ${reworded.automatedBy} now - it runs automated.\n` +
        '    Check that its code does what the step says'
    )
  }
  if (reworded.nowAutomated.length > 0) {
    console.log(
      `\n${getIcon('warning')}  Manual steps the new pattern matches - they run its code now:`
    )
    reworded.nowAutomated.forEach((step) => console.log(`    • ${step}`))
  }
  if (!check) console.log(`\n${getIcon('info')}  Check specs and step definitions: npm run dress\n`)
}

function findSpec(suite: string | undefined): string {
  const specs = findSpecFiles()
  const spec = specs.find((s) => getMarkdownBaseName(s) === suite || getSuiteKey(s) === suite)
  if (!spec)
    throw new Error(
      `Unknown suite "${suite}" - specs: ${specs.map(getMarkdownBaseName).join(', ')}`
    )
  return spec
}
