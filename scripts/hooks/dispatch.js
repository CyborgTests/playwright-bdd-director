#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

/**
 * Single hook entry point for every AI tool (Claude Code, Devin, Codex preflight).
 *
 *   node scripts/hooks/dispatch.js <edit|bash>   (tool payload as JSON on stdin)
 *
 * Runs every check from checks/index.js in-process (one node process per tool event
 * instead of one per check), merges results deny > ask > allow and joins contexts.
 *
 * A plain warning never sets permissionDecision: in Claude Code "allow" skips the
 * user's permission prompt, so warnings travel only as additionalContext.
 * Fails open: unreadable input or a crashing check never blocks the tool call.
 */
const fs = require('fs')
const path = require('path')

const checks = require('./checks')

const repoRoot = path.resolve(__dirname, '..', '..')
const RANK = { allow: 0, ask: 1, deny: 2 }
const EDIT_TOOLS = /^(edit|write|multiedit|notebookedit)$/i

function toRelPath(filePath) {
  if (!filePath) return ''
  return path.relative(repoRoot, path.resolve(repoRoot, filePath)).replace(/\\/g, '/')
}

function collectIncoming(toolInput) {
  const parts = [toolInput.content, toolInput.new_string, toolInput.new_source]
  for (const edit of toolInput.edits || []) parts.push(edit.new_string)
  return parts.filter(Boolean).join('\n')
}

function buildContext(input, kindArg) {
  const toolInput = input.tool_input || {}
  const kind =
    kindArg ||
    (EDIT_TOOLS.test(String(input.tool_name || '')) ? 'edit' : toolInput.command ? 'bash' : 'edit')
  const filePath = String(toolInput.file_path || toolInput.notebook_path || '')
  const absPath = filePath ? path.resolve(repoRoot, filePath) : ''

  return {
    event: input.hook_event_name === 'PostToolUse' ? 'PostToolUse' : 'PreToolUse',
    kind,
    repoRoot,
    relPath: toRelPath(filePath),
    incoming: collectIncoming(toolInput),
    previous: String(toolInput.old_string || ''),
    command: String(toolInput.command || ''),
    readFile() {
      try {
        return fs.readFileSync(absPath, 'utf8')
      } catch {
        return null
      }
    }
  }
}

function runChecks(ctx) {
  const results = []
  for (const check of checks) {
    if (!check.kinds.includes(ctx.kind) || !check.events.includes(ctx.event)) continue
    try {
      const result = check.run(ctx)
      if (result) results.push({ name: check.name, ...result })
    } catch (err) {
      process.stderr.write(`[hooks] ${check.name} failed open: ${err.message}\n`)
    }
  }
  return results
}

function mergeResults(event, results) {
  const decided = results.filter((r) => r.decision && r.decision !== 'allow')
  const decision = decided.reduce(
    (top, r) => (RANK[r.decision] > RANK[top] ? r.decision : top),
    'allow'
  )
  const reasons = decided.filter((r) => r.decision === decision).map((r) => r.reason)
  const contexts = results.map((r) => r.context).filter(Boolean)

  const output = { hookEventName: event }
  if (event === 'PreToolUse' && decision !== 'allow') {
    output.permissionDecision = decision
    output.permissionDecisionReason = reasons.join(' | ')
  }
  if (contexts.length > 0) output.additionalContext = contexts.join('\n\n')
  return Object.keys(output).length > 1 ? { hookSpecificOutput: output } : null
}

function main() {
  let input
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    return
  }

  const ctx = buildContext(input, process.argv[2])
  const output = mergeResults(ctx.event, runChecks(ctx))
  // No process.exit() after writing: on Windows a pipe write can be truncated by an
  // immediate exit, so the process is left to finish naturally.
  if (output) process.stdout.write(JSON.stringify(output))
}

if (require.main === module) main()

module.exports = { buildContext, runChecks, mergeResults }
