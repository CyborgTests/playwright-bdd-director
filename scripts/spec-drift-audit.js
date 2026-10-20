#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

/**
 * AI specification audit (see .agents/skills/spec-drift-checker/SKILL.md).
 * Read-only by default; `--fix` only (re)creates the .claude/skills bridge.
 *
 *   node scripts/spec-drift-audit.js [--fix]
 */
const fs = require('fs')
const path = require('path')

const { ensureSkillsLink, isLinked } = require('./ensure-skills-link')

const repoRoot = path.resolve(__dirname, '..')
const fix = process.argv.includes('--fix')
const BUDGET = { core: 100, file: 70 }
const LONG_LINE = 300
const DISPATCHER = 'scripts/hooks/dispatch.js'
const MCP_LAUNCHER = 'scripts/mcp-playwright.js'

let failures = 0
let warnings = 0

const pass = (msg) => process.stdout.write(`  [PASS] ${msg}\n`)
const warn = (msg) => (warnings++, process.stdout.write(`  [WARN] ${msg}\n`))
const fail = (msg) => (failures++, process.stdout.write(`  [FAIL] ${msg}\n`))
const section = (title) => process.stdout.write(`\n${title}\n`)

const abs = (rel) => path.join(repoRoot, rel)
const exists = (rel) => fs.existsSync(abs(rel))
const read = (rel) => fs.readFileSync(abs(rel), 'utf8').replace(/\r\n/g, '\n')
const lineCount = (text) => (text ? text.replace(/\n$/, '').split('\n').length : 0)
const listDir = (rel, filter) =>
  exists(rel)
    ? fs
        .readdirSync(abs(rel), { withFileTypes: true })
        .filter(filter)
        .map((e) => e.name)
    : []

/** Minimal frontmatter reader: top-level `key: value` pairs and the body after it. */
function parseFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!match) return null
  const data = {}
  for (const line of match[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line)
    if (kv) data[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '').trim()
  }
  return { data, body: text.slice(match[0].length).trim() }
}

function checkBudget(rel, budget) {
  const lines = lineCount(read(rel))
  if (lines > budget) fail(`${rel}: ${lines} lines, budget ${budget}`)
  return lines
}

function checkCoreDoc() {
  section('1. Core doc')
  if (!exists('AGENTS.md')) return fail('AGENTS.md not found')
  pass(`AGENTS.md ${checkBudget('AGENTS.md', BUDGET.core)}/${BUDGET.core} lines`)
  if (!exists('CLAUDE.md')) return fail('CLAUDE.md not found')
  const claude = read('CLAUDE.md')
  if (!/^@AGENTS\.md$/m.test(claude)) fail('CLAUDE.md does not import @AGENTS.md')
  else if (lineCount(claude) > 15) fail('CLAUDE.md is no longer a thin stub (> 15 lines)')
  else pass('CLAUDE.md is an @AGENTS.md stub')
}

function checkRules() {
  section('2. Rules (.claude/rules)')
  const rules = listDir('.claude/rules', (e) => e.isFile() && e.name.endsWith('.md'))
  const agents = exists('AGENTS.md') ? read('AGENTS.md') : ''
  const cursor = exists('.cursor/rules/00-rules.mdc') ? read('.cursor/rules/00-rules.mdc') : ''
  const before = failures
  for (const file of rules) {
    const rel = `.claude/rules/${file}`
    const fm = parseFrontmatter(read(rel))
    const topic = file.replace(/\.md$/, '')
    if (!fm || !fm.data.description) fail(`${rel}: frontmatter with description required`)
    checkBudget(rel, BUDGET.file)
    if (!agents.includes(`\`${topic}\``)) fail(`${rel}: not listed in the AGENTS.md rule index`)
    if (!cursor.includes(`.claude/rules/${file}`))
      fail(`${rel}: missing from .cursor/rules/00-rules.mdc`)
  }
  if (failures === before)
    pass(`${rules.length} rules: frontmatter, budget, AGENTS.md index, Cursor pointer`)
}

function checkSkills() {
  section('3. Skills (.agents/skills)')
  const skills = listDir('.agents/skills', (e) => e.isDirectory())
  const before = failures
  for (const name of skills) {
    const rel = `.agents/skills/${name}/SKILL.md`
    if (!exists(rel)) {
      fail(`${name}: SKILL.md missing`)
      continue
    }
    const fm = parseFrontmatter(read(rel))
    if (!fm) fail(`${rel}: frontmatter missing`)
    else {
      if (fm.data.name !== name) fail(`${rel}: name "${fm.data.name}" != directory "${name}"`)
      if (!fm.data.description) fail(`${rel}: description missing`)
    }
    checkBudget(rel, BUDGET.file)
    for (const ref of listDir(`.agents/skills/${name}/references`, (e) => e.isFile())) {
      if (read(`.agents/skills/${name}/references/${ref}`).trim().length < 200) {
        fail(`${name}/references/${ref}: stub reference (< 200 chars)`)
      }
    }
  }
  if (failures === before) pass(`${skills.length} skills: name, description, budget, references`)
}

function checkAgents() {
  section('4. Subagents (.claude/agents ↔ .devin/agents)')
  const claudeAgents = listDir('.claude/agents', (e) => e.isFile() && e.name.endsWith('.md')).map(
    (f) => f.replace(/\.md$/, '')
  )
  const devinAgents = listDir('.devin/agents', (e) => e.isDirectory())
  const before = failures
  for (const name of claudeAgents) {
    const rel = `.claude/agents/${name}.md`
    const mirror = `.devin/agents/${name}/AGENT.md`
    const fm = parseFrontmatter(read(rel))
    if (!fm || fm.data.name !== name || !fm.data.description)
      fail(`${rel}: frontmatter name/description`)
    checkBudget(rel, BUDGET.file)
    if (!exists(mirror)) {
      fail(`${rel}: Devin mirror ${mirror} missing`)
      continue
    }
    const mirrorFm = parseFrontmatter(read(mirror))
    if (!mirrorFm || mirrorFm.body !== (fm && fm.body)) fail(`${mirror}: body differs from ${rel}`)
  }
  for (const name of devinAgents.filter((n) => !claudeAgents.includes(n))) {
    fail(`.devin/agents/${name}: no Claude counterpart`)
  }
  if (failures === before) pass(`${claudeAgents.length} subagents mirrored with identical bodies`)
}

function checkHooks() {
  section('5. Hooks')
  const before = failures
  const claudeCommands = []
  const settings = exists('.claude/settings.json') ? JSON.parse(read('.claude/settings.json')) : {}
  for (const groups of Object.values(settings.hooks || {})) {
    for (const group of groups)
      for (const hook of group.hooks || []) claudeCommands.push(hook.command)
  }
  const devin = exists('.devin/hooks.v1.json') ? JSON.parse(read('.devin/hooks.v1.json')) : {}
  const devinCommands = Object.values(devin).flatMap((groups) =>
    groups.flatMap((group) => (group.hooks || []).map((hook) => hook.command))
  )
  for (const [tool, commands] of [
    ['.claude/settings.json', claudeCommands],
    ['.devin/hooks.v1.json', devinCommands]
  ]) {
    if (commands.length === 0) fail(`${tool}: no hooks registered`)
    for (const command of commands.filter((c) => !String(c).includes(DISPATCHER))) {
      fail(`${tool}: hook bypasses the dispatcher: ${command}`)
    }
  }
  if (
    !exists('scripts/codex-preflight.js') ||
    !read('scripts/codex-preflight.js').includes("'dispatch.js'")
  ) {
    fail('scripts/codex-preflight.js does not use the dispatcher')
  }
  try {
    const checks = require(abs('scripts/hooks/checks'))
    for (const check of checks) {
      if (
        !check.name ||
        !Array.isArray(check.kinds) ||
        !Array.isArray(check.events) ||
        typeof check.run !== 'function'
      ) {
        fail(`hook check ${check.name || '(unnamed)'} has an invalid shape`)
      }
    }
    if (failures === before)
      pass(`${checks.length} checks behind ${DISPATCHER}, registered for Claude, Devin, Codex`)
  } catch (err) {
    fail(`scripts/hooks/checks failed to load: ${err.message}`)
  }
}

function checkMcp() {
  section('6. MCP')
  const before = failures
  for (const rel of [
    '.mcp.json',
    '.codex/config.toml',
    '.devin/mcp_config.json',
    ...listDir('.claude/agents', (e) => e.isFile()).map((f) => `.claude/agents/${f}`)
  ]) {
    if (!exists(rel)) continue
    const text = read(rel)
    if (/mcpServers|mcp_servers/.test(text) && !text.includes(MCP_LAUNCHER))
      fail(`${rel}: MCP server not started via ${MCP_LAUNCHER}`)
  }
  if (!exists(MCP_LAUNCHER)) fail(`${MCP_LAUNCHER} missing`)
  if (failures === before) pass(`MCP configs use ${MCP_LAUNCHER}`)
  if (!exists('node_modules/@playwright/mcp'))
    warn(
      '@playwright/mcp not installed locally — launcher falls back to npx (network on first start)'
    )
}

function checkSkillsBridge() {
  section('7. Skills bridge (.claude/skills → .agents/skills)')
  if (isLinked()) return pass('.claude/skills resolves to .agents/skills')
  if (fix && ensureSkillsLink()) return pass('.claude/skills bridge created (--fix)')
  fail(
    '.claude/skills is missing or points elsewhere — run `node scripts/ensure-skills-link.js` or `node scripts/spec-drift-audit.js --fix`'
  )
}

function collectSpecFiles() {
  const files = ['AGENTS.md', 'CLAUDE.md']
  const walk = (rel) => {
    for (const entry of listDir(rel, () => true)) {
      const child = `${rel}/${entry}`
      if (child === '.claude/skills') continue
      if (fs.statSync(abs(child)).isDirectory()) walk(child)
      else if (/\.(md|mdc)$/.test(entry)) files.push(child)
    }
  }
  ;['.claude', '.agents', '.cursor', '.devin'].forEach(walk)
  return files.filter(exists)
}

function checkLinksAndLines() {
  section('8. Links and line length')
  const files = collectSpecFiles()
  const before = failures
  for (const rel of files) {
    const text = read(rel)
    // Frontmatter descriptions are single long lines by design — skip them.
    const bodyStart = text.startsWith('---\n')
      ? text.slice(0, text.indexOf('\n---', 3) + 4).split('\n').length
      : 0
    let inFence = false
    text.split('\n').forEach((line, index) => {
      if (index < bodyStart) return
      if (/^\s*```/.test(line)) inFence = !inFence
      if (inFence) return
      if (line.length > LONG_LINE && !line.trimStart().startsWith('|')) {
        warn(
          `${rel}:${index + 1}: ${line.length} chars — split it, the line budget measures content`
        )
      }
      for (const [, target] of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue
        if (/^(file:|[a-zA-Z]:[\\/]|\/)/.test(target)) {
          fail(`${rel}:${index + 1}: non-portable link ${target}`)
          continue
        }
        const resolved = path.resolve(path.dirname(abs(rel)), target.split('#')[0])
        if (!fs.existsSync(resolved)) fail(`${rel}:${index + 1}: broken link ${target}`)
      }
    })
  }
  if (failures === before) pass(`links resolve across ${files.length} spec files`)
}

process.stdout.write('=== AI Specification Audit ===\n')
checkCoreDoc()
checkRules()
checkSkills()
checkAgents()
checkHooks()
checkMcp()
checkSkillsBridge()
checkLinksAndLines()
process.stdout.write(`\nAudit completed: ${failures} failure(s), ${warnings} warning(s)\n`)
process.exitCode = failures === 0 ? 0 : 1
