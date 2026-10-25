const SEPARATOR_WIDTH = 64

/** Console icons of the CLI output - one per message type */
const ICONS = {
  start: '✨',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: '💡',
  fix: '🔧',
  separator: '━'.repeat(SEPARATOR_WIDTH)
} as const

export type IconType = keyof typeof ICONS

export function getIcon(type: IconType): string {
  return ICONS[type]
}
