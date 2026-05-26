import { describe, expect, it } from 'vitest'

import { extractSuiteName, getTagConstant } from '@/framework/generation/tags-updater'

describe('extractSuiteName', () => {
  it('should return lowercase suite name', () => {
    expect(extractSuiteName('TODO')).toBe('todo')
    expect(extractSuiteName('Auth')).toBe('auth')
  })

  it('should handle simple names', () => {
    expect(extractSuiteName('todo')).toBe('todo')
    expect(extractSuiteName('login')).toBe('login')
  })

  it('should replace invalid characters with dashes', () => {
    expect(extractSuiteName('edge cases')).toBe('edge-cases')
    expect(extractSuiteName('auth_test')).toBe('auth-test')
    expect(extractSuiteName('user@login')).toBe('user-login')
  })

  it('should handle multiple invalid characters', () => {
    expect(extractSuiteName('test@#$%suite')).toBe('test----suite')
  })

  it('should handle empty string', () => {
    expect(extractSuiteName('')).toBe('')
  })

  it('should handle already valid names', () => {
    expect(extractSuiteName('edge-cases')).toBe('edge-cases')
    expect(extractSuiteName('auth-v2')).toBe('auth-v2')
  })
})

describe('getTagConstant', () => {
  it('should convert to uppercase', () => {
    expect(getTagConstant('todo')).toBe('TODO')
    expect(getTagConstant('auth')).toBe('AUTH')
  })

  it('should replace dashes with underscores', () => {
    expect(getTagConstant('edge-cases')).toBe('EDGE_CASES')
    expect(getTagConstant('auth-test')).toBe('AUTH_TEST')
  })

  it('should handle mixed case input', () => {
    expect(getTagConstant('ToDo')).toBe('TODO')
    expect(getTagConstant('Edge-Cases')).toBe('EDGE_CASES')
  })

  it('should handle empty string', () => {
    expect(getTagConstant('')).toBe('')
  })

  it('should handle multiple dashes', () => {
    expect(getTagConstant('a-b-c-d')).toBe('A_B_C_D')
  })

  it('should handle already valid constants', () => {
    expect(getTagConstant('TODO')).toBe('TODO')
    expect(getTagConstant('EDGE_CASES')).toBe('EDGE_CASES')
  })
})
