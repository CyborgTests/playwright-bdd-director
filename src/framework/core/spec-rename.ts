import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

import { CONFIG } from '../config'
import { SPEC_FILE_EXTENSION } from '../constants/markdown'
import { escapeRegExp, getMarkdownBaseName, toPosix } from '../utils/helpers'

export interface SpecRename {
  spec: { from: string; to: string }
  steps?: { from: string; to: string } // the spec's own step file, `<suite>.steps.ts`
  tagUses: string[] // `file:line` of step files naming the old suite tag (hooks) - left to the author
}

const BASE_NAME = /^[A-Za-z0-9][\w.-]*$/

/**
 * Rename a spec and its step file (`npm run steps` names it after the suite) - all or nothing:
 * the new name must be free for specs of both formats and for the step file. The suite tag
 * changes with the name; step files naming the old tag (hook tags) are listed, not changed.
 * @param specFiles - every spec, to keep base names unique
 * @throws Error when the name is invalid or taken - nothing is renamed then
 */
export function renameSpec(
  specPath: string,
  newBase: string,
  specFiles: string[],
  stepsDir: string = CONFIG.bdd.stepsDir
): SpecRename {
  checkSpecRename(specPath, newBase, specFiles, stepsDir)
  const oldBase = getMarkdownBaseName(specPath)
  const oldSteps = path.join(stepsDir, `${oldBase}.steps.ts`)
  const newSteps = path.join(stepsDir, `${newBase}.steps.ts`)
  if (!BASE_NAME.test(newBase) || SPEC_FILE_EXTENSION.test(newBase)) {
    throw new Error(
      `Invalid spec name "${newBase}"\n  Fix: Letters, digits, ".", "_" and "-" only, no extension and no folder`
    )
  }
  if (newBase === oldBase) throw new Error(`"${oldBase}" is the name already`)
  const taken = specFiles.find((spec) => getMarkdownBaseName(spec) === newBase)
  if (taken) {
    throw new Error(
      `Spec ${toPosix(taken)} has the name "${newBase}"\n  Fix: Pick a name no spec uses - the name is the suite tag`
    )
  }

  const newSpec = path.join(path.dirname(specPath), `${newBase}${path.extname(specPath)}`)
  fs.renameSync(specPath, newSpec)
  let steps: SpecRename['steps']
  if (fs.existsSync(oldSteps)) {
    // Comments such as "Skeletons from `npm run steps cart`" follow the name
    const content = fs
      .readFileSync(oldSteps, 'utf-8')
      .replace(
        new RegExp(`(npm run steps )${escapeRegExp(oldBase)}(?![\\w.-])`, 'g'),
        `$1${newBase}`
      )
    fs.writeFileSync(newSteps, content)
    fs.rmSync(oldSteps)
    steps = { from: toPosix(oldSteps), to: toPosix(newSteps) }
  }
  return {
    spec: { from: toPosix(specPath), to: toPosix(newSpec) },
    ...(steps ? { steps } : {}),
    tagUses: findTagUses(`@${oldBase}`, stepsDir)
  }
}

/**
 * What renameSpec checks before it changes anything - run it alone before another step (convert,
 * then rename) to keep the whole change all or nothing
 * @throws Error when the name is invalid or taken by a spec or a step file
 */
export function checkSpecRename(
  specPath: string,
  newBase: string,
  specFiles: string[],
  stepsDir: string = CONFIG.bdd.stepsDir
): void {
  const oldBase = getMarkdownBaseName(specPath)
  if (!BASE_NAME.test(newBase) || SPEC_FILE_EXTENSION.test(newBase)) {
    throw new Error(
      `Invalid spec name "${newBase}"\n  Fix: Letters, digits, ".", "_" and "-" only, no extension and no folder`
    )
  }
  if (newBase === oldBase) throw new Error(`"${oldBase}" is the name already`)
  const taken = specFiles.find((spec) => getMarkdownBaseName(spec) === newBase)
  if (taken) {
    throw new Error(
      `Spec ${toPosix(taken)} has the name "${newBase}"\n  Fix: Pick a name no spec uses - the name is the suite tag`
    )
  }
  const newSteps = path.join(stepsDir, `${newBase}.steps.ts`)
  if (fs.existsSync(newSteps)) {
    throw new Error(
      `Step file ${toPosix(newSteps)} exists already\n  Fix: Check what it holds and rename or merge it first - nothing was renamed`
    )
  }
}

/** `file:line` of step files with the tag as a whole word (`@cart`, not `@cart-api`) */
function findTagUses(tag: string, stepsDir: string): string[] {
  const pattern = new RegExp(`${escapeRegExp(tag)}(?![\\w.:/-])`)
  return glob
    .sync(`${toPosix(stepsDir)}/**/*.ts`, { nodir: true })
    .sort()
    .flatMap((file) =>
      fs
        .readFileSync(file, 'utf-8')
        .split('\n')
        .flatMap((line, index) => (pattern.test(line) ? [`${toPosix(file)}:${index + 1}`] : []))
    )
}
