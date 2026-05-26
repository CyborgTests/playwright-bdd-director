/**
 * Tag-to-project mapping for automatic project selection
 * When --grep matches a tag, corresponding project is used
 */
export const tagToProject: Record<string, string> = {
  '@auto': 'automated',
  '@api': 'automated',
  '@ui': 'automated',
  '@e2e': 'automated',
  '@manual': 'manual',
  '@hybrid': 'hybrid'
}
