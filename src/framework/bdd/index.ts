/**
 * Step definitions style for Gherkin specs (folders in CONFIG.bdd.dirs): steps are defined once
 * with Cucumber Expressions and `stage` generates tests that run them (`./runtime` - generated
 * code only). Given / When / Then / Step / StepsFor here are untyped - for Page Object
 * decorators; step files take the typed ones from createBdd(test).
 */
export {
  type BddContext,
  type BddStep,
  createBdd,
  defineParameterType,
  Given,
  Step,
  StepsFor,
  Then,
  When
} from './registry'
export { DataTable } from './runtime'
