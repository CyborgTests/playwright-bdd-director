/* eslint-disable no-console */
import fs from 'fs'

import { findSpecFiles } from '@/framework/bdd/build'
import { featureSpecToMarkdown, markdownSpecToFeature } from '@/framework/core/spec-converter'
import { parseSpecDocument } from '@/framework/core/spec-document'
import {
  getErrorMessage,
  getMarkdownBaseName,
  getSuiteKey,
  toPosix
} from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * Adapt - move specs between formats: `npm run adapt navigation` turns navigation.md into
 * navigation.feature and the other way round. The new file replaces the old one (a base name is
 * unique across formats); notes, tags, IDs and examples move along, anything Markdown cannot hold
 * stops the conversion.
 */
function main() {
  const suites = process.argv.slice(2)
  if (suites.length === 0) {
    console.error(`${getIcon('error')}  Usage: npm run adapt <suite...>, e.g. npm run adapt auth`)
    process.exit(1)
  }

  const specs = findSpecFiles()
  for (const suite of suites) {
    const specPath = specs.find(
      (spec) => getMarkdownBaseName(spec) === suite || getSuiteKey(spec) === suite
    )
    if (!specPath) {
      const known = specs.map((spec) => getMarkdownBaseName(spec)).join(', ')
      throw new Error(`Unknown suite "${suite}" - specs: ${known}`)
    }
    parseSpecDocument(specPath) // an invalid spec is fixed first, not converted

    const toFeature = specPath.endsWith('.md')
    const content = fs.readFileSync(specPath, 'utf-8')
    const target = specPath.replace(/\.(md|feature)$/, toFeature ? '.feature' : '.md')
    fs.writeFileSync(
      target,
      toFeature ? markdownSpecToFeature(content) : featureSpecToMarkdown(content, toPosix(specPath))
    )
    fs.rmSync(specPath)
    console.log(`${getIcon('fix')}  ${toPosix(specPath)} → ${toPosix(target)}`)
    if (toFeature) {
      // Markdown steps have no keywords, and which one fits (context, action, outcome) takes
      // understanding the step - adapt leaves it to the author
      console.log(
        `\n${getIcon('warning')}  Not finished: every step starts with "*" - Gherkin without Given / When / Then.\n` +
          `    Set the keywords in ${toPosix(target)} before using it (adapt cannot tell context from action from outcome)`
      )
    } else {
      console.log('    Step keywords are dropped: step definitions match the step text only')
    }
  }
  console.log(`\n${getIcon('info')}  Check specs and step definitions: npm run dress\n`)
}
