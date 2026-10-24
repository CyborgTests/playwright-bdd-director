import { describe, expect, it } from 'vitest'

import { getHeadingLevel, isHeading } from '@/framework/constants/markdown'

describe('isHeading', () => {
  describe('level 2 (suite)', () => {
    it('should match H2 heading', () => {
      expect(isHeading('## Test Suite', 2)).toBe(true)
    })

    it('should match H2 with ID', () => {
      expect(isHeading('## [TS01] Test Suite', 2)).toBe(true)
    })

    it('should match H2 with empty ID', () => {
      expect(isHeading('## [] Test Suite', 2)).toBe(true)
    })

    it('should match H2 with leading/trailing spaces', () => {
      expect(isHeading('  ## Test Suite  ', 2)).toBe(true)
    })

    it('should not match H3 when looking for H2', () => {
      expect(isHeading('### Test Case', 2)).toBe(false)
    })

    it('should not match H4 when looking for H2', () => {
      expect(isHeading('#### Step', 2)).toBe(false)
    })

    it('should not match H1', () => {
      expect(isHeading('# Title', 2)).toBe(false)
    })

    it('should not match text without heading', () => {
      expect(isHeading('Regular text', 2)).toBe(false)
    })

    it('should not match heading in code block', () => {
      expect(isHeading('```## Code```', 2)).toBe(false)
    })
  })

  describe('level 3 (test case)', () => {
    it('should match H3 heading', () => {
      expect(isHeading('### Test Case', 3)).toBe(true)
    })

    it('should match H3 with ID', () => {
      expect(isHeading('### [TC-01] Test Case', 3)).toBe(true)
    })

    it('should match H3 with empty ID', () => {
      expect(isHeading('### [] Test Case', 3)).toBe(true)
    })

    it('should match H3 with leading/trailing spaces', () => {
      expect(isHeading('  ### Test Case  ', 3)).toBe(true)
    })

    it('should not match H2 when looking for H3', () => {
      expect(isHeading('## Suite', 3)).toBe(false)
    })

    it('should not match H4 when looking for H3', () => {
      expect(isHeading('#### Step', 3)).toBe(false)
    })

    it('should not match H1 when looking for H3', () => {
      expect(isHeading('# Title', 3)).toBe(false)
    })

    it('should not match text without heading', () => {
      expect(isHeading('Regular text', 3)).toBe(false)
    })
  })

  describe('level 4 (step)', () => {
    it('should match H4 heading', () => {
      expect(isHeading('#### Step', 4)).toBe(true)
    })

    it('should match H4 with ID', () => {
      expect(isHeading('#### [01-01-01] Step title', 4)).toBe(true)
    })

    it('should match H4 with empty ID', () => {
      expect(isHeading('#### [] Step', 4)).toBe(true)
    })

    it('should match H4 with leading/trailing spaces', () => {
      expect(isHeading('  #### Step  ', 4)).toBe(true)
    })

    it('should not match H2 when looking for H4', () => {
      expect(isHeading('## Suite', 4)).toBe(false)
    })

    it('should not match H3 when looking for H4', () => {
      expect(isHeading('### Test Case', 4)).toBe(false)
    })

    it('should not match H1 when looking for H4', () => {
      expect(isHeading('# Title', 4)).toBe(false)
    })

    it('should not match H5', () => {
      expect(isHeading('##### H5', 4)).toBe(false)
    })

    it('should not match text without heading', () => {
      expect(isHeading('Regular text', 4)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(isHeading('', 2)).toBe(false)
      expect(isHeading('', 3)).toBe(false)
      expect(isHeading('', 4)).toBe(false)
    })

    it('should handle only hashes', () => {
      expect(isHeading('##', 2)).toBe(false)
      expect(isHeading('###', 3)).toBe(false)
      expect(isHeading('####', 4)).toBe(false)
    })

    it('should handle hashes without space', () => {
      expect(isHeading('##Title', 2)).toBe(false)
      expect(isHeading('###Title', 3)).toBe(false)
      expect(isHeading('####Title', 4)).toBe(false)
    })

    it('should handle multiple spaces after hashes', () => {
      expect(isHeading('##   Title', 2)).toBe(true)
      expect(isHeading('###   Title', 3)).toBe(true)
      expect(isHeading('####   Title', 4)).toBe(true)
    })

    it('should not match tabs (requires space)', () => {
      expect(isHeading('##\tTitle', 2)).toBe(false)
      expect(isHeading('###\tTitle', 3)).toBe(false)
      expect(isHeading('####\tTitle', 4)).toBe(false)
    })
  })
})

describe('getHeadingLevel', () => {
  describe('valid headings', () => {
    it('should return 2 for H2', () => {
      expect(getHeadingLevel('## Test Suite')).toBe(2)
    })

    it('should return 3 for H3', () => {
      expect(getHeadingLevel('### Test Case')).toBe(3)
    })

    it('should return 4 for H4', () => {
      expect(getHeadingLevel('#### Step')).toBe(4)
    })

    it('should handle H2 with ID', () => {
      expect(getHeadingLevel('## [TS01] Suite')).toBe(2)
    })

    it('should handle H3 with ID', () => {
      expect(getHeadingLevel('### [TC-01] Test')).toBe(3)
    })

    it('should handle H4 with ID', () => {
      expect(getHeadingLevel('#### [01] Step')).toBe(4)
    })

    it('should handle leading/trailing spaces', () => {
      expect(getHeadingLevel('  ## Suite  ')).toBe(2)
      expect(getHeadingLevel('  ### Test  ')).toBe(3)
      expect(getHeadingLevel('  #### Step  ')).toBe(4)
    })
  })

  describe('invalid headings', () => {
    it('should return null for H1', () => {
      expect(getHeadingLevel('# Title')).toBe(null)
    })

    it('should return null for H5', () => {
      expect(getHeadingLevel('##### Title')).toBe(null)
    })

    it('should return null for H6', () => {
      expect(getHeadingLevel('###### Title')).toBe(null)
    })

    it('should return null for regular text', () => {
      expect(getHeadingLevel('Regular text')).toBe(null)
    })

    it('should return null for empty string', () => {
      expect(getHeadingLevel('')).toBe(null)
    })

    it('should return null for only hashes', () => {
      expect(getHeadingLevel('##')).toBe(null)
      expect(getHeadingLevel('###')).toBe(null)
      expect(getHeadingLevel('####')).toBe(null)
    })

    it('should return null for hashes without space', () => {
      expect(getHeadingLevel('##Title')).toBe(null)
      expect(getHeadingLevel('###Title')).toBe(null)
      expect(getHeadingLevel('####Title')).toBe(null)
    })
  })

  describe('priority order (most specific first)', () => {
    it('should correctly identify when multiple patterns match', () => {
      // This shouldn't happen in valid markdown, but test the order
      expect(getHeadingLevel('#### Step')).toBe(4) // H4 checked first
    })
  })

  describe('edge cases', () => {
    it('should handle multiple spaces', () => {
      expect(getHeadingLevel('##   Title')).toBe(2)
      expect(getHeadingLevel('###   Title')).toBe(3)
      expect(getHeadingLevel('####   Title')).toBe(4)
    })

    it('should not match tabs (requires space)', () => {
      expect(getHeadingLevel('##\tTitle')).toBe(null)
      expect(getHeadingLevel('###\tTitle')).toBe(null)
      expect(getHeadingLevel('####\tTitle')).toBe(null)
    })

    it('should handle complex titles', () => {
      expect(getHeadingLevel('## [TS01] Suite with [brackets] in title')).toBe(2)
      expect(getHeadingLevel('### [TC-01] Test with ### inside')).toBe(3)
      expect(getHeadingLevel('#### [01] Step with #### inside')).toBe(4)
    })
  })
})
