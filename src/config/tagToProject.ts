/**
 * Tag-to-project mapping for automatic project selection
 * When --grep matches a tag, corresponding project is used
 */
export const tagToProject: Record<string, string> = {
  '@auto': 'automated',
  '@manual': 'manual',
  '@hybrid': 'hybrid'
}
