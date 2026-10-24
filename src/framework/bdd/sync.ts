import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import {
  getBddCyborgPath,
  getBddSpecKey,
  getBddTestPath,
  getErrorMessage,
  isCyborgDisabledFor
} from '../utils/helpers'
import { generateBddCyborgTest } from './cyborg-generator'
import { type BddGeneration, generateBddTest, loadStepDefinitions } from './generator'

export interface BddTestsResult {
  generations: BddGeneration[] // automated and cyborg test of every Gherkin spec
  errors: Array<{ file: string; errors: string[] }> // specs that could not be generated, ambiguous steps
  staleFiles: string[] // generated tests without a Gherkin spec
}

/**
 * Generate (in memory) the automated and cyborg test of every Gherkin spec among spec files
 * (no cyborg test for CONFIG.noCyborg)
 */
export async function buildBddTests(specFiles: string[]): Promise<BddTestsResult> {
  const specs = specFiles.flatMap((specPath) => {
    const key = getBddSpecKey(specPath)
    return key === null ? [] : [{ specPath, key }]
  })
  const result: BddTestsResult = { generations: [], errors: [], staleFiles: [] }

  if (specs.length > 0) {
    try {
      await loadStepDefinitions()
    } catch (error: unknown) {
      result.errors.push({ file: CONFIG.bdd.steps, errors: [getErrorMessage(error)] })
      return result
    }
  }

  for (const { specPath, key } of specs) {
    try {
      const generation = await generateBddTest(specPath, getBddTestPath(key))
      result.generations.push(generation)
      if (generation.ambiguous.length > 0) {
        result.errors.push({ file: specPath, errors: generation.ambiguous })
      }
      if (!isCyborgDisabledFor(specPath)) {
        result.generations.push(await generateBddCyborgTest(specPath, getBddCyborgPath(key)))
      }
    } catch (error: unknown) {
      result.errors.push({ file: specPath, errors: [getErrorMessage(error)] })
    }
  }

  const expected = new Set(result.generations.map((g) => path.resolve(g.testPath)))
  result.staleFiles = [CONFIG.bdd.testsDir, CONFIG.bdd.cyborgDir]
    .flatMap((dir) => glob.sync(`${dir}/**/*.test.ts`, { nodir: true }))
    .filter((file) => !expected.has(path.resolve(file)))
  return result
}

/**
 * Generated file differs from the file on disk (or is missing). A generation with ambiguous steps
 * is never written - it is reported as an error instead.
 */
export function isBddTestOutdated(generation: BddGeneration): boolean {
  if (generation.ambiguous.length > 0) return false
  if (!fs.existsSync(generation.testPath)) return true
  return fs.readFileSync(generation.testPath, 'utf-8') !== generation.content
}
