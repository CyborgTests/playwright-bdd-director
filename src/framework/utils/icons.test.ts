import { describe, expect, it } from 'vitest'

import { getIcon } from '@/framework/utils/icons'

describe('getIcon', () => {
  it('should return the icon of each message type', () => {
    expect((['start', 'success', 'warning', 'error', 'info', 'fix'] as const).map(getIcon)).toEqual(
      ['✨', '✅', '⚠️', '❌', '💡', '🔧']
    )
  })

  it('should return a separator line', () => {
    const separator = getIcon('separator')
    expect(separator).toMatch(/^━+$/)
    expect(separator.length).toBe(64)
  })
})
