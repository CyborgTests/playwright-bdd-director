import path from 'path'
import { describe, expect, it } from 'vitest'

import { CONFIG } from '@/framework/config'
import { archiveOrphanedTests } from '@/framework/generation/test-archiver'

describe('archiveOrphanedTests', () => {
  it('should skip files that are already in the archive', () => {
    // Nonexistent file: an attempt to move it would throw
    const archivedFile = path.join(CONFIG.paths.testsArchived, 'ghost.cyborg.test.ts')

    const stats = archiveOrphanedTests([archivedFile], new Map())

    expect(stats).toEqual({ cyborg: 0, auto: 0 })
  })
})
