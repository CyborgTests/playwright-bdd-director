import fs from 'fs'
import path from 'path'

import { CONFIG } from '../config'
import type { CoverageMatrix } from './coverage-matrix'

/**
 * A run is recorded for the coverage trend when RECORD_RUN=1: `npm run play --record`, the
 * "Record run" checkbox of UI mode; read when the run ends, as the UI turns it on and off
 */
export function isRunRecorded(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RECORD_RUN === '1'
}

/**
 * Coverage matrix of the run - every spec, the results of the tests this run ran - to its own
 * file named by the run's end (`run-history/2026-10-27T14-05-12.345Z.json`): one file per run,
 * none overwritten
 */
export function writeRunSnapshot(
  matrix: CoverageMatrix,
  finishedAt: string,
  dir: string = CONFIG.paths.runHistory
): string {
  const file = path.join(dir, `${finishedAt.replace(/:/g, '-')}.json`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(matrix, null, 2)}\n`, { flag: 'wx' })
  return file
}
