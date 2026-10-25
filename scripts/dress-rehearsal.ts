/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { allProjects } from '@/config/projects'
import { buildTests } from '@/framework/bdd/build'
import { CONFIG } from '@/framework/config'
import { printSpecErrors } from '@/framework/reporting/console-formatter'
import {
  buildDressReport,
  renderDressConsole,
  renderDressMarkdown,
  summaryLine
} from '@/framework/reporting/dress-report'
import { getErrorMessage } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Dress Rehearsal - check of specs and step definitions before a run: what would stop it (invalid
 * specs, missing layers, ambiguous steps), what runs on which project, what a person still walks,
 * disabled tests and step definitions no spec uses. Changes no spec, step or test; the report is
 * written to CONFIG.paths.dressReport as well.
 */
async function main() {
  console.log(`${getIcon('start')}  Dress rehearsal\n`)

  const report = buildDressReport(await buildTests(), allProjects)
  console.log(renderDressConsole(report))

  if (report.errors.length > 0) {
    printSpecErrors(
      report.errors,
      'Tests are generated on every run - fix the specs or step definitions'
    )
    console.log('')
  }

  const reportPath = CONFIG.paths.dressReport
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, renderDressMarkdown(report))

  const ok = report.errors.length === 0
  console.log(`${getIcon(ok ? 'success' : 'error')}  ${summaryLine(report)}`)
  console.log(`    Report: ${reportPath}\n`)
  if (!ok) process.exit(1)
}
