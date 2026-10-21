/**
 * Test execution tags for grep-based filtering
 *
 * Usage in tests:
 * test.describe('Suite', { tag: [TAG.TEST.AUTO, TAG.SUITE.TODO] }, () => {})
 *
 * Usage in CLI:
 * npx playwright test --grep "@auto.*@todo"
 * npm run play:auto  (uses @auto tag)
 */

export const TAG = {
  /**
   * Test execution type
   */
  TEST: {
    AUTO: '@auto',
    CYBORG: '@cyborg'
  },

  /**
   * Test type category
   */
  TYPE: {
    API: '@api',
    UI: '@ui',
    E2E: '@e2e'
  },

  /**
   * Test suite / functional area
   * Auto-generated from test-suites/*.md filenames:
   * - auth.md → AUTH: '@auth'
   * - 12345.md → NUMBER_12345: '@12345'
   * - user-profile.md → USER_PROFILE: '@user-profile'
   */
  SUITE: {
    AUTH: '@auth',
    NUMBER_1: '@1',
    NUMBER_11: '@11',
    LOGIN: '@login',
    NAVIGATION: '@navigation'
  }
} as const
