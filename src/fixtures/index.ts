import { mergeTests } from '@playwright/test'

import { test as authTest } from './auth.fixture'

/**
 * Test with the fixtures of every suite (base fixtures included) - generated tests take `test`
 * from here (CONFIG.bdd.fixtures) and step definitions are typed by it. Merge new suite fixtures in.
 */
export const test = mergeTests(authTest)

export { expect } from '@playwright/test'
