/* eslint-disable no-console */
import { getIcon } from '../utils/icons'

export interface ErrorGroup {
  title: string
  errors?: string[]
}

export interface PrintOptions {
  /** Fix message inside groups (before separator, 4 spaces) */
  fixMessageInside?: string
  /** Fix message after separator (2 spaces) */
  fixMessageAfter?: string
}

/**
 * Print error groups with separators in unified format
 */
export function printErrorGroups(groups: ErrorGroup[], options?: PrintOptions): void {
  for (const group of groups) {
    console.log(getIcon('separator'))
    console.log(`  ${group.title}`)
    if (group.errors && group.errors.length > 0) {
      group.errors.forEach((err) => {
        const lines = err.split('\n')
        lines.forEach((line) => console.log(`    ${line}`))
      })
    }
  }
  if (options?.fixMessageInside) {
    console.log(`    ${getIcon('info')}  ${options.fixMessageInside}`)
  }
  console.log(getIcon('separator'))
  if (options?.fixMessageAfter) {
    console.log(`  ${getIcon('info')}  ${options.fixMessageAfter}`)
  }
}
