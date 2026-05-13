/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { CONFIG } from '@/framework/config'

import { getTestFileBaseName } from '../utils/helpers'
import { getIcon } from '../utils/icons'
import { isEmptyAutoTest } from './auto-fixer'

export interface ArchiveStats {
  manual: number
  auto: number
}

/**
 * Archive orphaned tests (tests without corresponding MD files)
 * - Manual tests are always archived (preserve manual work)
 * - Empty automated tests are archived (no implementation to lose)
 * - Implemented automated tests are NOT archived (can continue running)
 * @returns Statistics about archived files
 */
export function archiveOrphanedTests(
  testFiles: string[],
  markdownByBaseName: Map<string, string>
): ArchiveStats {
  const archivedDir = CONFIG.paths.testsArchived
  const stats: ArchiveStats = { manual: 0, auto: 0 }

  for (const testFile of testFiles) {
    if (!testFile) continue

    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    if (!baseName) continue

    // Check if corresponding MD exists
    if (!markdownByBaseName.has(baseName)) {
      const isManual = fileName.includes('manual')
      const isAuto = fileName.includes('auto')

      let shouldArchive = false

      if (isManual) {
        // Always archive manual tests
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
        if (isManual) stats.manual++
        if (isAuto) stats.auto++
      }
    }
  }

  return stats
}
