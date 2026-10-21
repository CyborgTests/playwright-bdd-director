/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'
import { collectCoverageMatrix, filterCoverageByTags } from '@/framework/reporting/coverage-matrix'
import { renderConsole, renderHtml, renderMarkdown } from '@/framework/reporting/coverage-renderers'
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

/**
 * Coverage matrix: which spec test cases are covered by cyborg / api / ui / e2e tests
 * Usage: npm run matrix [-- @tags] [--json[=path]] [--html[=path]] [--md[=path]] [--min=<percent>]
 *
 * Examples:
 *   npm run matrix                         # console table only
 *   npm run matrix -- --html --json        # + test-results/coverage-matrix.{html,json}
 *   npm run matrix -- --md=docs/matrix.md  # Markdown to custom path
 *   npm run matrix -- --min=80             # exit 1 when automated coverage < 80%
 *   npm run matrix -- @smoke               # only test cases tagged @smoke in spec
 */

const FORMATS = {
  json: (matrix: ReturnType<typeof collectCoverageMatrix>) =>
    `${JSON.stringify(matrix, null, 2)}\n`,
  html: renderHtml,
  md: renderMarkdown
} as const

try {
  main()
} catch (error: unknown) {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
}

function main() {
  const args = process.argv.slice(2)
  const minArg = args.find((arg) => arg.startsWith('--min='))
  const minPercent = minArg ? Number(minArg.slice('--min='.length)) : null
  if (minPercent !== null && (Number.isNaN(minPercent) || minPercent < 0 || minPercent > 100)) {
    throw new Error(`Invalid ${minArg}: expected a percent from 0 to 100, e.g. --min=80`)
  }

  const unknownArgs = args.filter(
    (arg) =>
      !arg.startsWith('@') &&
      !arg.startsWith('--min=') &&
      !Object.keys(FORMATS).some(
        (format) => arg === `--${format}` || arg.startsWith(`--${format}=`)
      )
  )
  if (unknownArgs.length > 0) {
    throw new Error(
      `Unknown argument(s): ${unknownArgs.join(' ')}\nUsage: npm run matrix -- [@tags] [--json[=path]] [--html[=path]] [--md[=path]] [--min=<percent>]`
    )
  }

  const tags = args.filter((arg) => arg.startsWith('@'))
  const matrix =
    tags.length > 0 ? filterCoverageByTags(collectCoverageMatrix(), tags) : collectCoverageMatrix()
  const color = process.stdout.isTTY && !process.env.NO_COLOR
  console.log(`${renderConsole(matrix, { color })}\n`)

  for (const error of matrix.errors) {
    console.warn(`${getIcon('warning')}  Skipped ${error}`)
  }

  for (const [format, render] of Object.entries(FORMATS)) {
    const arg = args.find((a) => a === `--${format}` || a.startsWith(`--${format}=`))
    if (!arg) continue

    const outputPath = arg.includes('=')
      ? arg.slice(arg.indexOf('=') + 1)
      : `${CONFIG.paths.coverageMatrix}.${format}`
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, render(matrix))
    console.log(`${getIcon('success')}  ${format.toUpperCase()} saved to ${outputPath}`)
  }

  if (minPercent !== null && matrix.summary.automatedPercent < minPercent) {
    console.error(
      `${getIcon('error')}  Automated coverage ${matrix.summary.automatedPercent}% is below --min=${minPercent}%`
    )
    process.exit(1)
  }
}
