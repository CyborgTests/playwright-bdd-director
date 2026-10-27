import { spawnSync } from 'child_process'
import { createRequire } from 'module'
import path from 'path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(__dirname, '../..')
const dispatcher = path.join(repoRoot, 'scripts/hooks/dispatch.js')
const { mergeResults } = require('./dispatch.js')
const checkSpecBudget = require('./checks/check-spec-budget.js')

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string
    permissionDecision?: string
    permissionDecisionReason?: string
    additionalContext?: string
  }
}

function dispatch(kind: 'edit' | 'bash', toolInput: object, event = 'PreToolUse'): HookOutput {
  const result = spawnSync(process.execPath, [dispatcher, kind], {
    input: JSON.stringify({ hook_event_name: event, tool_input: toolInput }),
    encoding: 'utf8'
  })
  expect(result.status).toBe(0)
  return result.stdout.trim() ? JSON.parse(result.stdout) : {}
}

const edit = (filePath: string, content = '') => dispatch('edit', { file_path: filePath, content })
const bash = (command: string) => dispatch('bash', { command })

describe('hook dispatcher', () => {
  it('denies edits inside node_modules', () => {
    const out = edit('node_modules/playwright/lib/program.js', 'x')
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny')
    expect(out.hookSpecificOutput?.permissionDecisionReason).toContain('patch-playwright.js')
  })

  it('denies edits of generated tests', () => {
    const out = edit('.director/tests/auth.test.ts', 'x')
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny')
    expect(out.hookSpecificOutput?.permissionDecisionReason).toContain('step definitions')
  })

  it('normalizes absolute Windows-style paths to repo-relative ones', () => {
    const out = edit(path.join(repoRoot, 'src', 'steps', 'auth.steps.ts'))
    expect(out.hookSpecificOutput?.additionalContext).toContain('npm run dress')
  })

  it('never sets permissionDecision for plain warnings', () => {
    const out = edit('src/steps/auth.steps.ts')
    expect(out.hookSpecificOutput?.additionalContext).toBeTruthy()
    expect(out.hookSpecificOutput?.permissionDecision).toBeUndefined()
  })

  it('stays silent for unrelated files and invalid input', () => {
    expect(edit('src/schemas/user.schema.ts', 'const a = 1')).toEqual({})
    const result = spawnSync(process.execPath, [dispatcher, 'edit'], {
      input: 'not json',
      encoding: 'utf8'
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toBe('')
  })

  it('merges decisions deny > ask > allow and joins contexts', () => {
    const merged = mergeResults('PreToolUse', [
      { decision: 'ask', reason: 'a', context: 'one' },
      { decision: 'deny', reason: 'd' },
      { context: 'two' }
    ])
    expect(merged.hookSpecificOutput).toEqual({
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'd',
      additionalContext: 'one\n\ntwo'
    })
  })
})

describe('guard-git-and-destructive', () => {
  it.each([
    'git commit -m "x"',
    'git push origin main',
    'git add .',
    'git reset --hard HEAD',
    'rm -rf dist',
    // Spellings that must not slip past: global options, quotes, .exe, split flags, PowerShell
    'git -C . push origin main',
    'git -c core.pager=cat push',
    'git --git-dir .git --work-tree . commit -m x',
    'git --no-pager commit -m x',
    '"git" push',
    'git.exe push',
    'C:/Program Files/Git/bin/git.exe add .',
    'npm run lint && git push',
    'rm -r -f dist',
    'rm --recursive --force dist',
    'Remove-Item -Recurse -Force src',
    'remove-item src -r'
  ])('asks for %s', (command) => {
    expect(bash(command).hookSpecificOutput?.permissionDecision).toBe('ask')
  })

  it.each([
    'git status',
    'git diff --stat',
    'git -C . log --oneline',
    'git log --grep push',
    'npm run dress',
    'rm file.txt',
    'rm -r dist',
    'Remove-Item file.txt'
  ])('allows %s', (command) => {
    expect(bash(command)).toEqual({})
  })
})

describe('check-test-conventions', () => {
  it('flags anti-patterns in the test layer', () => {
    const context = edit('src/steps/auth.steps.ts', 'await page.waitForTimeout(500)\ntest.only(')
      .hookSpecificOutput?.additionalContext
    expect(context).toContain('waitForTimeout()')
    expect(context).toContain('.only')
  })

  it('ignores commented-out code and non-test-layer files', () => {
    expect(
      edit('src/pages/LoginPage.ts', '// await page.waitForTimeout(500)').hookSpecificOutput
        ?.additionalContext ?? ''
    ).not.toContain('waitForTimeout')
    expect(
      edit('src/framework/bdd/generator.ts', 'page.waitForTimeout(1)').hookSpecificOutput
        ?.additionalContext ?? ''
    ).not.toContain('waitForTimeout')
  })
})

describe('note-docs-sync', () => {
  it.each(['src/framework/reporting/coverage-matrix.ts', 'scripts/adapt.ts'])(
    'reminds to update the docs for %s',
    (filePath) => {
      expect(edit(filePath).hookSpecificOutput?.additionalContext).toContain('grep the command')
    }
  )

  it.each([
    'src/framework/reporting/coverage-matrix.test.ts',
    'scripts/hooks/hooks.test.ts',
    'src/pages/ProductsPage.ts'
  ])('stays quiet for %s', (filePath) => {
    expect(edit(filePath).hookSpecificOutput?.additionalContext ?? '').not.toContain(
      'grep the command'
    )
  })
})

describe('check-secret-leak', () => {
  it('warns about a JWT-looking token', () => {
    const token = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'abcdefghijklmnop'].join(
      '.'
    )
    const out = edit('src/clients/AuthClient.ts', `const token = '${token}'`)
    expect(out.hookSpecificOutput?.additionalContext).toContain('JWT token')
  })
})

describe('note-spec-mirror', () => {
  it('reports a skill name that differs from its directory', () => {
    const out = edit('.agents/skills/run-tests/SKILL.md', '---\nname: run-test\n---')
    expect(out.hookSpecificOutput?.additionalContext).toContain(
      'must equal the directory name "run-tests"'
    )
  })

  it('stays silent when the skill name matches', () => {
    const out = edit('.agents/skills/run-tests/SKILL.md', '---\nname: run-tests\n---')
    expect(out.hookSpecificOutput?.additionalContext ?? '').not.toContain('directory name')
  })
})

describe('check-spec-budget', () => {
  const ctx = (event: string, relPath: string, lines: number) => ({
    event,
    relPath,
    readFile: () => Array.from({ length: lines }, (_, i) => `line ${i}`).join('\n')
  })

  it('reminds of the admission test before AGENTS.md edits', () => {
    expect(edit('AGENTS.md').hookSpecificOutput?.additionalContext).toContain('admission test')
  })

  it('reports an over-budget skill after the edit', () => {
    const result = checkSpecBudget.run(ctx('PostToolUse', '.agents/skills/x/SKILL.md', 75))
    expect(result.context).toContain('over its 70-line budget')
  })

  it('stays silent for a rule well within budget', () => {
    expect(checkSpecBudget.run(ctx('PostToolUse', '.claude/rules/x.md', 40))).toBeNull()
  })
})
