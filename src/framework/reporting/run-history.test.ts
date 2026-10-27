import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { buildCoverageMatrix } from '@/framework/reporting/coverage-matrix'
import { isRunRecorded, writeRunSnapshot } from '@/framework/reporting/run-history'

describe('isRunRecorded', () => {
  it('should record only with RECORD_RUN=1', () => {
    expect(isRunRecorded({ RECORD_RUN: '1' })).toBe(true)
    expect(isRunRecorded({ RECORD_RUN: '0' })).toBe(false)
    expect(isRunRecorded({})).toBe(false)
  })
})

describe('writeRunSnapshot', () => {
  it('should keep every run in its own file named by its end', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-history-'))
    const matrix = buildCoverageMatrix({ generations: [], errors: [] })
    try {
      const first = writeRunSnapshot(matrix, '2026-10-27T14:05:12.345Z', dir)
      writeRunSnapshot(matrix, '2026-10-27T15:00:00.000Z', dir)

      expect(path.basename(first)).toBe('2026-10-27T14-05-12.345Z.json')
      expect(fs.readdirSync(dir)).toHaveLength(2)
      expect(JSON.parse(fs.readFileSync(first, 'utf-8'))).toEqual(matrix)
      expect(() => writeRunSnapshot(matrix, '2026-10-27T14:05:12.345Z', dir)).toThrow()
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
