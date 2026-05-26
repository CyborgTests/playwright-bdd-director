/**
 * Extract project names from --grep pattern using tag-to-project mapping
 * Returns array of unique projects or empty array if no matching tag found
 *
 * Example: --grep "@api|@hybrid" with mapping -> ["automated", "hybrid"]
 * Example: --grep "@manual.*@todo" with mapping -> ["manual"]
 */
export function getProjectsFromGrep(tagToProject: Record<string, string>): string[] {
  const grepArg = process.argv.find((arg) => arg.startsWith('--grep'))
  if (!grepArg) return []

  const grepValue = grepArg.includes('=')
    ? grepArg.split('=')[1]?.replace(/['"]/g, '')
    : process.argv[process.argv.indexOf(grepArg) + 1]?.replace(/['"]/g, '')

  if (!grepValue) return []

  const projects = new Set<string>()
  for (const [tag, project] of Object.entries(tagToProject)) {
    if (grepValue.includes(tag)) {
      projects.add(project)
    }
  }

  return Array.from(projects)
}
