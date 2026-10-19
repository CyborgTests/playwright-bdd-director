/**
 * Aligns current titles (test cases or steps in a TS file) with expected MD titles without
 * relying on position alone, so an MD insertion/removal never shifts titles onto wrong code.
 *
 * 1. Anchors: longest common subsequence of items that `isSame` (title or stable ID match).
 * 2. Between two anchors, unmatched items on both sides:
 *    - equal counts → paired in order (safe rename: the gap is unambiguous)
 *    - otherwise   → expected items are inserted, current items are reported as extra
 * 3. An extra current item whose title equals an inserted expected title was moved in MD:
 *    both become `moved` (report only - code order is never rewritten automatically).
 */

export type AlignOp =
  /** Current item `current` implements expected item `expected` (title may need renaming) */
  | { kind: 'pair'; current: number; expected: number }
  /** Expected item is missing in code; insert it after current item `after` (null = first) */
  | { kind: 'insert'; expected: number; after: number | null }
  /** Current item has no MD counterpart - keep code, report for manual review */
  | { kind: 'extra'; current: number }
  /** Same title exists on both sides but in different order - report for manual reorder */
  | { kind: 'moved'; current: number; expected: number }

export function alignByTitle<C, E>(
  current: readonly C[],
  expected: readonly E[],
  isSame: (_current: C, _expected: E) => boolean
): AlignOp[] {
  const anchors = longestCommonSubsequence(current, expected, isSame)
  const ops: AlignOp[] = []

  let prevCurrent = -1
  let prevExpected = -1
  for (const [anchorCurrent, anchorExpected] of [...anchors, [current.length, expected.length]]) {
    const gapCurrent = range(prevCurrent + 1, anchorCurrent)
    const gapExpected = range(prevExpected + 1, anchorExpected)

    if (gapCurrent.length === gapExpected.length) {
      gapCurrent.forEach((c, i) => ops.push({ kind: 'pair', current: c, expected: gapExpected[i] }))
    } else {
      for (const e of gapExpected) {
        ops.push({ kind: 'insert', expected: e, after: prevCurrent === -1 ? null : prevCurrent })
      }
      for (const c of gapCurrent) ops.push({ kind: 'extra', current: c })
    }

    if (anchorCurrent < current.length) {
      ops.push({ kind: 'pair', current: anchorCurrent, expected: anchorExpected })
    }
    prevCurrent = anchorCurrent
    prevExpected = anchorExpected
  }

  return detectMoves(ops, current, expected, isSame)
}

function detectMoves<C, E>(
  ops: AlignOp[],
  current: readonly C[],
  expected: readonly E[],
  isSame: (_current: C, _expected: E) => boolean
): AlignOp[] {
  const result = [...ops]
  for (let i = 0; i < result.length; i++) {
    const insert = result[i]
    if (insert.kind !== 'insert') continue
    const extraIndex = result.findIndex(
      (op) => op.kind === 'extra' && isSame(current[op.current], expected[insert.expected])
    )
    if (extraIndex === -1) continue
    const extra = result[extraIndex] as { kind: 'extra'; current: number }
    result[i] = { kind: 'moved', current: extra.current, expected: insert.expected }
    result.splice(extraIndex, 1)
    if (extraIndex < i) i--
  }
  return result
}

/** Index pairs [current, expected] of the longest common subsequence, in order */
function longestCommonSubsequence<C, E>(
  current: readonly C[],
  expected: readonly E[],
  isSame: (_current: C, _expected: E) => boolean
): Array<[number, number]> {
  const rows = current.length
  const cols = expected.length
  const lengths = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0))

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lengths[i][j] = isSame(current[i], expected[j])
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1])
    }
  }

  const pairs: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < rows && j < cols) {
    if (isSame(current[i], expected[j])) {
      pairs.push([i, j])
      i++
      j++
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pairs
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, k) => from + k)
}
