import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import { SPEC_FILE_GLOB } from '../constants/markdown'
import { getErrorMessage, getMarkdownBaseName, getSuiteKey } from '../utils/helpers'
import { validateMDStructure } from '../validation/md-validator'
import { generateTest, type Generation, loadStepDefinitions } from './generator'
import { getStepDefinitions, type StepDefinition } from './registry'

export interface BuildResult {
  generations: Generation[] // test file of every valid spec
  errors: Array<{ file: string; errors: string[] }> // invalid specs and step definitions, ambiguous steps, layers
  unused: StepDefinition[] // step definitions no spec step matches
}

/**
 * Generate (in memory) the test file of every spec - tests always follow the specs and step
 * definitions as they are now, nothing to keep in sync by hand
 */
export async function buildTests(specFiles = findSpecFiles()): Promise<BuildResult> {
  const result: BuildResult = { generations: [], errors: [], unused: [] }
  try {
    await loadStepDefinitions()
  } catch (error: unknown) {
    result.errors.push({ file: CONFIG.bdd.steps, errors: [getErrorMessage(error)] })
    return result
  }

  // The base name is the suite tag (`npm run play auth`) and pairs reports with the spec
  const byName = new Map<string, string[]>()
  for (const specPath of specFiles) {
    const name = getMarkdownBaseName(specPath)
    byName.set(name, [...(byName.get(name) ?? []), specPath])
  }
  for (const [name, paths] of byName) {
    if (paths.length > 1) {
      result.errors.push({
        file: paths.join(', '),
        errors: [`Several specs named "${name}"\n  Fix: Give every spec a unique file name`]
      })
    }
  }

  for (const specPath of specFiles) {
    if (byName.get(getMarkdownBaseName(specPath))!.length > 1) continue
    const structure = specPath.endsWith('.md') ? validateMDStructure(specPath) : []
    if (structure.length > 0) {
      result.errors.push({
        file: specPath,
        errors: structure.map((e) => (e.line ? `Line ${e.line}: ${e.message}` : e.message))
      })
      continue
    }
    try {
      const generation = await generateTest(specPath, getGeneratedTestPath(specPath))
      result.generations.push(generation)
      if (generation.errors.length > 0) {
        result.errors.push({ file: specPath, errors: generation.errors })
      }
    } catch (error: unknown) {
      result.errors.push({ file: specPath, errors: [getErrorMessage(error)] })
    }
  }

  const used = new Set(result.generations.flatMap((g) => [...g.used]))
  result.unused = getStepDefinitions().filter((definition) => !used.has(definition))
  return result
}

/**
 * Write the generated tests (only changed files) and remove tests of specs that are gone
 * @returns files written and removed
 */
export function writeTests(
  generations: Generation[],
  dir = CONFIG.paths.generatedTests
): { written: string[]; removed: string[] } {
  const expected = new Set(generations.map((g) => path.resolve(g.testPath)))
  const removed = glob
    .sync(`${toPosix(dir)}/**/*.test.ts`, { nodir: true })
    .filter((file) => !expected.has(path.resolve(file)))
  removed.forEach((file) => fs.rmSync(file))

  const written = generations
    .filter((g) => !fs.existsSync(g.testPath) || fs.readFileSync(g.testPath, 'utf-8') !== g.content)
    .map((g) => {
      fs.mkdirSync(path.dirname(g.testPath), { recursive: true })
      fs.writeFileSync(g.testPath, g.content)
      return g.testPath
    })
  return { written, removed }
}

export function findSpecFiles(testSuitesDir = CONFIG.paths.testSuites): string[] {
  return glob.sync(`${toPosix(testSuitesDir)}/${SPEC_FILE_GLOB}`, { nodir: true }).sort()
}

/** "test-suites/shop/cart.feature" -> ".director/tests/shop/cart.test.ts" */
export function getGeneratedTestPath(
  specPath: string,
  dir = CONFIG.paths.generatedTests,
  testSuitesDir = CONFIG.paths.testSuites
): string {
  return path.join(dir, `${getSuiteKey(specPath, testSuitesDir)}.test.ts`)
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
