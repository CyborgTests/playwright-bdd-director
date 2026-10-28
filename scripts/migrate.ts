/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import prettier from 'prettier'

import { findSpecFiles } from '@/framework/bdd/build'
import { loadStepDefinitions } from '@/framework/bdd/generator'
import { migratePlaywrightTest } from '@/framework/bdd/migrate'
import { matchStepDefinitions } from '@/framework/bdd/registry'
import { CONFIG } from '@/framework/config'
import { getErrorMessage, getMarkdownBaseName, toPosix } from '@/framework/utils/helpers'
import { getIcon } from '@/framework/utils/icons'

main().catch((error: unknown) => {
  console.error(`${getIcon('error')}  `, getErrorMessage(error))
  process.exit(1)
})

/**
 * Migrate - Playwright tests to a spec and step definitions: `npm run migrate tests/login.spec.ts`
 * writes test-suites/login.md and src/steps/login.steps.ts. Only tests made of `test.step` calls
 * (their titles become the steps). All or nothing: a file that cannot be moved whole, a taken
 * name or a step matching an existing step definition stops it; the test files stay as they are.
 */
async function main() {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    throw new Error(
      'Usage: npm run migrate <file.spec.ts...>, e.g. npm run migrate tests/login.spec.ts'
    )
  }
  await loadStepDefinitions()
  const taken = new Set(findSpecFiles().map(getMarkdownBaseName))

  const writes: { file: string; content: string }[] = []
  const reports: string[] = []
  const errors: string[] = []
  for (const source of files) {
    const suite = path.basename(source).replace(/\.(spec|test)\.[cm]?[jt]sx?$/, '')
    const spec = path.join(CONFIG.paths.testSuites, `${suite}.md`)
    const steps = path.join(CONFIG.bdd.stepsDir, `${suite}.steps.ts`)
    try {
      if (!fs.existsSync(source)) throw new Error(`${source} not found`)
      if (!/^[A-Za-z0-9][\w.-]*$/.test(suite)) throw new Error(`"${suite}" is not a spec name`)
      if (taken.has(suite)) throw new Error(`A spec is named ${suite} already`)
      if (fs.existsSync(steps)) throw new Error(`${toPosix(steps)} exists already`)
      taken.add(suite)

      const migrated = migratePlaywrightTest(fs.readFileSync(source, 'utf-8'), {
        sourcePath: source,
        suite,
        stepsDir: CONFIG.bdd.stepsDir,
        matchExisting: (text) => matchStepDefinitions(text)[0]?.definition.location
      })
      const options = await prettier.resolveConfig(steps)
      writes.push(
        { file: spec, content: migrated.markdown },
        {
          file: steps,
          content: await prettier.format(migrated.steps, { ...options, filepath: steps })
        }
      )
      reports.push(
        `${getIcon('fix')}  ${toPosix(source)} → ${toPosix(spec)} (${migrated.tests} tests) + ${toPosix(steps)} (${migrated.stepDefinitions} step definitions)`,
        ...migrated.warnings.map((warning) => `${getIcon('warning')}  ${warning}`)
      )
    } catch (error: unknown) {
      errors.push(getErrorMessage(error))
    }
  }
  if (errors.length > 0) throw new Error(`Nothing migrated:\n${errors.join('\n')}`)

  for (const { file, content } of writes) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
  }
  reports.forEach((line) => console.log(line))
  console.log(
    `\n${getIcon('info')}  Check: npm run dress, then run the suites (npm run play <suite>).\n` +
      '    The test files stay: delete them once the migrated tests pass\n'
  )
}
