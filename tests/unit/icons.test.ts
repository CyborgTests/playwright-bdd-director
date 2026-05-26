import { describe, expect, it } from 'vitest'

import { getIcon } from '@/framework/utils/icons'

describe('getIcon', () => {
  it('should return suite icon', () => {
    expect(getIcon('suite')).toBe('📋')
  })

  it('should return testCase icon', () => {
    expect(getIcon('testCase')).toBe('📝')
  })

  it('should return step icon', () => {
    expect(getIcon('step')).toBe('👣')
  })

  it('should return structure icon', () => {
    expect(getIcon('structure')).toBe('🏗️')
  })

  it('should return start icon', () => {
    expect(getIcon('start')).toBe('✨')
  })

  it('should return success icon', () => {
    expect(getIcon('success')).toBe('✅')
  })

  it('should return warning icon', () => {
    expect(getIcon('warning')).toBe('⚠️')
  })

  it('should return error icon', () => {
    expect(getIcon('error')).toBe('❌')
  })

  it('should return info icon', () => {
    expect(getIcon('info')).toBe('💡')
  })

  it('should return fix icon', () => {
    expect(getIcon('fix')).toBe('🔧')
  })

  it('should return separator', () => {
    const separator = getIcon('separator')
    expect(separator).toContain('━')
    expect(separator.length).toBe(64)
  })

  it('should return default warning icon for unknown type', () => {
    expect(getIcon('unknown')).toBe('⚠️')
    expect(getIcon('')).toBe('⚠️')
  })

  it('should return default for undefined', () => {
    expect(getIcon(undefined as unknown as string)).toBe('⚠️')
  })
})
