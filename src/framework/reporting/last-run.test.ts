import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { type LastRunEntry, mergeLastRun, readLastRun } from '@/framework/reporting/last-run'

function entry(title: string, project: string, finishedAt: string): LastRunEntry {
  return { file: '.director/tests/cart.test.ts', title, project, outcome: 'passed', finishedAt }
}

describe('mergeLastRun', () => {
  it('should replace results of tests that ran again and keep the others', () => {
    const merged = mergeLastRun(
      [entry('Add', 'chrome', 'old'), entry('Add', 'cyborg', 'old'), entry('Pay', 'chrome', 'old')],
      [entry('Add', 'chrome', 'new')]
    )

    expect(merged.map((e) => `${e.title} ${e.project} ${e.finishedAt}`)).toEqual([
      'Add chrome new',
      'Add cyborg old',
      'Pay chrome old'
    ])
  })
})

describe('readLastRun', () => {
  it('should read entries and give none for a missing or broken file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'last-run-'))
    const file = path.join(dir, 'last-run.json')
    try {
      expect(readLastRun(file)).toEqual([])
      fs.writeFileSync(file, '{ broken')
      expect(readLastRun(file)).toEqual([])
      fs.writeFileSync(file, JSON.stringify([entry('Add', 'chrome', 'new')]))
      expect(readLastRun(file)).toEqual([entry('Add', 'chrome', 'new')])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
