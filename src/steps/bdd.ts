import { test } from '@/fixtures/base.fixture'
import { createBdd } from '@/framework/bdd'

/**
 * Step definition functions typed with fixtures of the base test (Page Objects, clients)
 */
export const { Given, When, Then, Step } = createBdd(test)
