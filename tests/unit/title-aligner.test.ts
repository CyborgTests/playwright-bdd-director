import { describe, expect, it } from 'vitest'

import { alignByTitle } from '@/framework/generation/title-aligner'

const same = (a: string, b: string) => a === b
const align = (current: string[], expected: string[]) => alignByTitle(current, expected, same)

describe('alignByTitle', () => {
  it('should pair identical lists in order', () => {
    expect(align(['A', 'B'], ['A', 'B'])).toEqual([
      { kind: 'pair', current: 0, expected: 0 },
      { kind: 'pair', current: 1, expected: 1 }
    ])
  })

  it('should insert new expected item between anchors instead of shifting titles', () => {
    expect(align(['Login', 'Logout'], ['Login', 'Register', 'Logout'])).toEqual([
      { kind: 'pair', current: 0, expected: 0 },
      { kind: 'insert', expected: 1, after: 0 },
      { kind: 'pair', current: 1, expected: 2 }
    ])
  })

  it('should insert at start when new item comes first', () => {
    expect(align(['B'], ['A', 'B'])).toEqual([
      { kind: 'insert', expected: 0, after: null },
      { kind: 'pair', current: 0, expected: 1 }
    ])
  })

  it('should report removed item as extra and keep others paired', () => {
    expect(align(['A', 'B', 'C'], ['A', 'C'])).toEqual([
      { kind: 'pair', current: 0, expected: 0 },
      { kind: 'extra', current: 1 },
      { kind: 'pair', current: 2, expected: 1 }
    ])
  })

  it('should pair renamed item when gap is unambiguous', () => {
    expect(align(['A', 'Old', 'C'], ['A', 'New', 'C'])).toEqual([
      { kind: 'pair', current: 0, expected: 0 },
      { kind: 'pair', current: 1, expected: 1 },
      { kind: 'pair', current: 2, expected: 2 }
    ])
  })

  it('should not rename when gap is ambiguous (rename + insert together)', () => {
    expect(align(['A', 'Old'], ['A', 'New', 'Other'])).toEqual([
      { kind: 'pair', current: 0, expected: 0 },
      { kind: 'insert', expected: 1, after: 0 },
      { kind: 'insert', expected: 2, after: 0 },
      { kind: 'extra', current: 1 }
    ])
  })

  it('should report reordered items as moved without changes', () => {
    const ops = align(['A', 'B'], ['B', 'A'])

    expect(ops).toHaveLength(2)
    expect(ops.filter((op) => op.kind === 'pair')).toHaveLength(1)
    expect(ops.filter((op) => op.kind === 'moved')).toHaveLength(1)
    expect(ops.some((op) => op.kind === 'insert' || op.kind === 'extra')).toBe(false)
  })

  it('should insert all expected items into empty code', () => {
    expect(align([], ['A', 'B'])).toEqual([
      { kind: 'insert', expected: 0, after: null },
      { kind: 'insert', expected: 1, after: null }
    ])
  })

  it('should use custom matcher (e.g. stable IDs)', () => {
    const ops = alignByTitle(
      ['[tc1] Old title', '[tc2] Second'],
      ['[tc0] New first', '[tc1] New title', '[tc2] Second'],
      (c, e) => c.slice(0, 5) === e.slice(0, 5)
    )
    expect(ops).toEqual([
      { kind: 'insert', expected: 0, after: null },
      { kind: 'pair', current: 0, expected: 1 },
      { kind: 'pair', current: 1, expected: 2 }
    ])
  })
})
