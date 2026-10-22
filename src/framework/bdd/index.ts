/**
 * Step definitions style for Gherkin specs (folders in CONFIG.bdd.dirs): steps are defined once
 * with Cucumber Expressions and `stage` generates tests that call them through runStep
 */
export { createBdd, defineParameterType } from './registry'
export { DataTable, runHook, runStep, type StepArgument } from './runtime'
