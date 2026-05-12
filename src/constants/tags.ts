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
    MANUAL: '@manual',
    HYBRID: '@hybrid'
  },

  /**
   * Test type category
   */
  TYPE: {
    API: '@api',
    E2E: '@e2e'
  },

  /**
   * Test suite / functional area
   */
  SUITE: {
    TODO: '@todo',
    EDGE_CASES: '@edge-cases',
    TODO_COPY: '@todo-copy'
  }
} as const
