/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'
import { AUTOMATED_KINDS } from '@/framework/constants/test-files'

import { getTestFileBaseName, isBddTestFile } from '../utils/helpers'
import { getIcon } from '../utils/icons'
import { isEmptyAutoTest } from './auto-fixer'

export interface ArchiveStats {
  cyborg: number
  auto: number
}

/**
 * Archive orphaned tests (tests without corresponding MD files)
 * - Cyborg tests are always archived (preserve cyborg work)
 * - Empty automated tests are archived (no implementation to lose)
 * - Implemented automated tests are NOT archived (can continue running)
 * @returns Statistics about archived files
 */
export function archiveOrphanedTests(
  testFiles: string[],
  markdownByBaseName: Map<string, string>
): ArchiveStats {
  const archivedDir = CONFIG.paths.testsArchived
  const stats: ArchiveStats = { cyborg: 0, auto: 0 }

  for (const testFile of testFiles) {
    if (!testFile) continue
    // Already archived - skip, otherwise it is "moved" onto itself and counted on every stage run
    if (path.resolve(path.dirname(testFile)) === path.resolve(archivedDir)) continue
    // Generated tests without spec are deleted by the bdd phase of stage
    if (isBddTestFile(testFile)) continue

    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    if (!baseName) continue

    // Check if corresponding MD exists
    if (!markdownByBaseName.has(baseName)) {
      const fileNameLower = fileName.toLowerCase()
      const isCyborg = fileNameLower.includes('.cyborg.')
      const isAuto = AUTOMATED_KINDS.some((kind) =>
        fileNameLower.includes(`.${kind.toLowerCase()}.`)
      )

      let shouldArchive = false

      if (isCyborg) {
        // Always archive cyborg tests
        shouldArchive = true
      } else if (isAuto) {
        // Archive only empty auto tests (no implementation to lose)
        shouldArchive = isEmptyAutoTest(testFile)
      }

      if (shouldArchive) {
        // Create archived directory if needed
        if (!fs.existsSync(archivedDir)) {
          fs.mkdirSync(archivedDir, { recursive: true })
        }

        // Move file to archived
        const archivedPath = path.join(archivedDir, fileName)
        fs.renameSync(testFile, archivedPath)

        console.log(`${getIcon('warning')}  Archived: ${testFile} → ${archivedPath}`)

        // Update stats
        if (isCyborg) stats.cyborg++
        if (isAuto) stats.auto++
      }
    }
  }

  return stats
}
