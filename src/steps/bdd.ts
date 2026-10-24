import { test } from '@/fixtures'
import { createBdd } from '@/framework/bdd'

/**
 * Step definition and hook functions typed with fixtures of the generated tests (Page Objects,
 * clients, suite fixtures)
 */
export const {
  Given,
  When,
  Then,
  Step,
  Before,
  After,
  BeforeAll,
  AfterAll,
  BeforeStep,
  AfterStep
} = createBdd(test)
