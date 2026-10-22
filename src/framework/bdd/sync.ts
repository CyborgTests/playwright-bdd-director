import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import { getBddSpecKey, getBddTestPath, getErrorMessage } from '../utils/helpers'
import { type BddGeneration, generateBddTest, loadStepDefinitions } from './generator'

export interface BddTestsResult {
  generations: BddGeneration[]
  errors: Array<{ file: string; errors: string[] }> // specs that could not be generated, ambiguous steps
  staleFiles: string[] // generated tests without a step definitions style spec
}

/**
 * Generate (in memory) tests of all step definitions style specs among spec files
 */
export async function buildBddTests(specFiles: string[]): Promise<BddTestsResult> {
  const specs = specFiles.flatMap((specPath) => {
    const key = getBddSpecKey(specPath)
    return key === null ? [] : [{ specPath, testPath: getBddTestPath(key) }]
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

  for (const { specPath, testPath } of specs) {
    try {
      const generation = await generateBddTest(specPath, testPath)
      result.generations.push(generation)
      if (generation.ambiguous.length > 0) {
        result.errors.push({ file: specPath, errors: generation.ambiguous })
      }
    } catch (error: unknown) {
      result.errors.push({ file: specPath, errors: [getErrorMessage(error)] })
    }
  }

  const expected = new Set(result.generations.map((g) => path.resolve(g.testPath)))
  result.staleFiles = glob
    .sync(`${CONFIG.bdd.testsDir}/**/*.bdd.test.ts`, { nodir: true })
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
