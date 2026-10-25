/* eslint-disable no-console */
import type { BuildResult } from '../bdd/build'
import { getIcon } from '../utils/icons'

/**
 * Problems of the specs and step definitions, one block per file between separators, with an
 * optional hint after them
 */
export function printSpecErrors(errors: BuildResult['errors'], hint?: string): void {
  for (const { file, errors: messages } of errors) {
    console.log(getIcon('separator'))
    console.log(`  Spec: ${file}`)
    messages.flatMap((message) => message.split('\n')).forEach((line) => console.log(`    ${line}`))
  }
  console.log(getIcon('separator'))
  if (hint) console.log(`  ${getIcon('info')}  ${hint}`)
}
