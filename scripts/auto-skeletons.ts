/* eslint-disable no-console */
import { execSync } from 'child_process'
import { glob } from 'glob'
import path from 'path'

import { AUTOMATED_KINDS } from '@/framework/constants/test-files'
import { CONFIG } from '@/framework/config'
import { generateAutoTestFile } from '@/framework/generation/test-generator'
import {
  getErrorMessage,
  getMarkdownBaseName
} from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

/**
 * Generate AUTO test skeletons for all markdown files
 */
function main() {
  console.log(`${getIcon('start')}  Generating AUTO test skeletons...`)
  console.log('')

  const markdownFiles = glob.sync(`${CONFIG.paths.testSuites}/*.md`)
  let generated = 0
  let skipped = 0
  const generatedFiles: string[] = []

  for (const markdownFile of markdownFiles) {
    const baseName = getMarkdownBaseName(markdownFile)
    const candidates = glob.sync(`${CONFIG.paths.testsDir}/**/${baseName}.*.test.ts`)

    // Check if any automated test file already exists (AUTO, API, UI, E2E)
    const hasAutomatedTest = candidates.some((f) => {
      const fileName = path.basename(f).toLowerCase()
      return AUTOMATED_KINDS.some((kind) => fileName.includes(`.${kind.toLowerCase()}.`))
    })

    if (hasAutomatedTest) {
      skipped++
      continue
    }

    if (generateAutoTestFile(baseName)) {
      generatedFiles.push(`${baseName}.auto.test.ts`)
      generated++
    }
  }

  console.log('')
  console.log(`${getIcon('success')}  Generated ${generated} AUTO test(s), skipped ${skipped}`)

  // Output generated files
  if (generatedFiles.length > 0) {
    console.log('')
    console.log(`${getIcon('success')}  Generated files:`)
    generatedFiles.forEach((file) => console.log(`    • ${file}`))
  }

  // Format and lint test-suites and tests
  if (generated > 0) {
    console.log('')
    console.log(`${getIcon('info')}  Formatting and linting test-suites and tests...`)
    execSync('npm run format:tests', { stdio: 'inherit' })
    execSync('npm run lint:fix:tests', { stdio: 'inherit' })
  }
}
