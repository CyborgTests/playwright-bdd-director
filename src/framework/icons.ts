/**
 * Get emoji icon for different message types
 * Used for console output formatting
 */
export function getIcon(type: string): string {
  switch (type) {
    case 'suite':
      return '📋'
    case 'testCase':
      return '📝'
    case 'step':
      return '👣'
    case 'structure':
      return '🏗️'
    case 'start':
      return '✨'
    case 'success':
      return '✅'
    case 'warning':
      return '⚠️'
    case 'error':
      return '❌'
    case 'info':
      return '💡'
    case 'fix':
      return '🔧'
    case 'separator':
      return '━'.repeat(64)
    default:
      return '⚠️'
  }
}
