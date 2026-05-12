/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

import { PATHS } from '../constants/paths'
import { getTestFileBaseName } from './helpers'
import { getIcon } from './icons'

/**
 * Archive orphaned manual tests (tests without corresponding MD files)
 * Manual tests are archived (not deleted) to preserve manual work
 * Auto/hybrid tests are not archived as they can be regenerated
 */
export function archiveOrphanedManualTests(
  manualTestFiles: string[],
  markdownByBaseName: Map<string, string>
): void {
  const archivedDir = PATHS.TESTS_ARCHIVED

  for (const testFile of manualTestFiles) {
    if (!testFile) continue

    const fileName = path.basename(testFile)
    const baseName = getTestFileBaseName(fileName)

    if (!baseName) continue

    // Check if corresponding MD exists
    if (!markdownByBaseName.has(baseName)) {
      // Create archived directory if needed
      if (!fs.existsSync(archivedDir)) {
        fs.mkdirSync(archivedDir, { recursive: true })
      }

      // Move file to archived
      const archivedPath = path.join(archivedDir, fileName)
      fs.renameSync(testFile, archivedPath)

      console.log(`${getIcon('warning')}   Archived: ${testFile} → ${archivedPath}`)
    }
  }
}
