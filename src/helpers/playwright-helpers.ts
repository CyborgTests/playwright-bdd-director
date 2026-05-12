/**
 * Extract project name from --grep pattern using tag-to-project mapping
 * Returns undefined if no matching tag found or --grep not provided
 *
 * Example: --grep "@manual.*@todo" with mapping {@auto: 'automated', @manual: 'manual'} -> "manual"
 */
export function getProjectFromGrep(tagToProject: Record<string, string>): string | undefined {
  const grepArg = process.argv.find((arg) => arg.startsWith('--grep'))
  if (!grepArg) return undefined

  const grepValue = grepArg.includes('=')
    ? grepArg.split('=')[1]?.replace(/['"]/g, '')
    : process.argv[process.argv.indexOf(grepArg) + 1]?.replace(/['"]/g, '')

  if (!grepValue) return undefined

  for (const [tag, project] of Object.entries(tagToProject)) {
    if (grepValue.includes(tag)) {
      return project
    }
  }

  return undefined
}
