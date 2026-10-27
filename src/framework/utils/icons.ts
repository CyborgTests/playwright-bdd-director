const SEPARATOR_WIDTH = 64

/**
 * Console icons of the CLI output - one per message type. Each takes two terminal cells, so the
 * text after them lines up: no symbol + U+FE0F emoji such as ⚠️, many terminals draw it one cell wide
 */
const ICONS = {
  start: '✨',
  success: '✅',
  warning: '🔶',
  error: '❌',
  info: '💡',
  fix: '🔧',
  separator: '━'.repeat(SEPARATOR_WIDTH)
} as const

export type IconType = keyof typeof ICONS

export function getIcon(type: IconType): string {
  return ICONS[type]
}
