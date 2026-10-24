import { mergeTests } from '@playwright/test'

import { test as authTest } from './auth.fixture'
import { test as contactUsTest } from './contact-us.fixture'
import { test as shopTest } from './shop.fixture'

/**
 * Test with the fixtures of every suite (base fixtures included) - generated tests take `test`
 * from here (CONFIG.bdd.fixtures) and step definitions are typed by it. Merge new suite fixtures in.
 */
export const test = mergeTests(authTest, contactUsTest, shopTest)

export { expect } from '@playwright/test'
