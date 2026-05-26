import fs from 'fs'

import { CONFIG } from '@/framework/config'

import type { ValidatorResult } from '../validation/sync-validator'

export interface ValidationMetrics {
  totalFiles: number
  validFiles: number
  invalidFiles: number
  errors: {
    duplicateBaseNames: number
    mdStructure: number
    globalIDs: number
    syncFailures: number
  }
  executionTimeMs: number
  timestamp: string
}

export interface DirectorPhaseMetrics {
  files: number
  fixed: number
  timeMs: number
}

export interface DirectorMetrics extends ValidationMetrics {
  phases: {
    mdFormatting: DirectorPhaseMetrics
    validation: { timeMs: number }
    generation: { manual: number; auto: number; timeMs: number }
    archiving: { manual: number; auto: number; timeMs: number }
    autoFix: { manual: number; auto: number; timeMs: number }
    formatLint: { timeMs: number }
  }
}

/**
 * Collect validation metrics from validator result
 */
export function collectValidationMetrics(
  result: ValidatorResult,
  startTime: number
): ValidationMetrics {
  return {
    totalFiles: result.markdownFiles.length,
    validFiles: result.validationResults.filter((r) => r.valid).length,
    invalidFiles: result.validationResults.filter((r) => !r.valid).length,
    errors: {
      duplicateBaseNames: result.errors.duplicateBaseNames ? 1 : 0,
      mdStructure: result.errors.mdStructure?.length ?? 0,
      globalIDs: result.errors.globalIDs?.length ?? 0,
      syncFailures: result.errors.validationFailures?.length ?? 0
    },
    executionTimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  }
}

/**
 * Save metrics to JSON file
 */
export function saveMetrics(metrics: ValidationMetrics | DirectorMetrics): void {
  if (!CONFIG.metrics.enabled) return

  const outputPath = CONFIG.metrics.saveTo

  let existing: Array<ValidationMetrics | DirectorMetrics> = []
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
    } catch {
      // Invalid JSON, start fresh
      existing = []
    }
  }

  existing.push(metrics)
  fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2))
}

/**
 * Format metrics for console output
 */
export function formatMetrics(metrics: ValidationMetrics): string {
  const lines: string[] = []

  lines.push('📊  Metrics:')
  lines.push(`    Total files: ${metrics.totalFiles}`)
  lines.push(`    Valid: ${metrics.validFiles}, Invalid: ${metrics.invalidFiles}`)

  if (metrics.errors.duplicateBaseNames > 0) {
    lines.push(`    Errors: ${metrics.errors.duplicateBaseNames} duplicate basenames`)
  }
  if (metrics.errors.mdStructure > 0) {
    lines.push(`    Errors: ${metrics.errors.mdStructure} MD structure issues`)
  }
  if (metrics.errors.globalIDs > 0) {
    lines.push(`    Errors: ${metrics.errors.globalIDs} global ID conflicts`)
  }
  if (metrics.errors.syncFailures > 0) {
    lines.push(`    Errors: ${metrics.errors.syncFailures} sync failures`)
  }

  lines.push(`    Execution time: ${metrics.executionTimeMs}ms`)

  return lines.join('\n')
}

/**
 * Format director metrics for console output
 */
export function formatDirectorMetrics(metrics: DirectorMetrics): string {
  const lines: string[] = []

  lines.push('📊  Director Metrics:')
  lines.push(`    Total files: ${metrics.totalFiles}`)
  lines.push(`    Valid: ${metrics.validFiles}, Invalid: ${metrics.invalidFiles}`)
  lines.push('')
  lines.push('    Phases:')
  lines.push(
    `    • MD Formatting: ${metrics.phases.mdFormatting.fixed}/${metrics.phases.mdFormatting.files} fixed (${metrics.phases.mdFormatting.timeMs}ms)`
  )
  lines.push(`    • Validation: ${metrics.phases.validation.timeMs}ms`)
  lines.push(
    `    • Generation: ${metrics.phases.generation.manual} manual, ${metrics.phases.generation.auto} auto (${metrics.phases.generation.timeMs}ms)`
  )
  lines.push(
    `    • Archiving: ${metrics.phases.archiving.manual} manual, ${metrics.phases.archiving.auto} auto (${metrics.phases.archiving.timeMs}ms)`
  )
  lines.push(
    `    • Auto-fix: ${metrics.phases.autoFix.manual} manual, ${metrics.phases.autoFix.auto} auto (${metrics.phases.autoFix.timeMs}ms)`
  )
  lines.push(`    • Format & Lint: ${metrics.phases.formatLint.timeMs}ms`)
  lines.push('')
  lines.push(`    Total execution: ${metrics.executionTimeMs}ms`)

  return lines.join('\n')
}
