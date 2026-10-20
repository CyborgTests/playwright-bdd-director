#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

/**
 * Manual hook bridge for tools without native hooks (Codex). Feeds the same payload
 * Claude Code would send to scripts/hooks/dispatch.js and prints the outcome.
 *
 *   node scripts/codex-preflight.js edit <path>        before editing a file
 *   node scripts/codex-preflight.js post-edit <path>   after editing it
 *   node scripts/codex-preflight.js bash "<command>"   before a shell command
 *
 * Exit codes: 0 allow, 2 deny (abort), 3 ask (get user confirmation).
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const dispatcher = path.join(__dirname, 'hooks', 'dispatch.js')
const mode = process.argv[2]
const value = process.argv.slice(3).join(' ')

function buildPayload() {
  if (mode === 'bash') {
    return {
      kind: 'bash',
      input: { hook_event_name: 'PreToolUse', tool_input: { command: value } }
    }
  }
  if (mode === 'post-edit') {
    return {
      kind: 'edit',
      input: { hook_event_name: 'PostToolUse', tool_input: { file_path: value } }
    }
  }
  const content = fs.existsSync(value) ? fs.readFileSync(value, 'utf8') : ''
  return {
    kind: 'edit',
    input: { hook_event_name: 'PreToolUse', tool_input: { file_path: value, content } }
  }
}

function main() {
  if (!['edit', 'post-edit', 'bash'].includes(mode) || !value) {
    process.stderr.write(
      'Usage: node scripts/codex-preflight.js <edit path|post-edit path|bash command>\n'
    )
    process.exit(1)
  }

  const { kind, input } = buildPayload()
  const result = spawnSync(process.execPath, [dispatcher, kind], {
    input: JSON.stringify(input),
    encoding: 'utf8'
  })
  if (result.error) {
    process.stderr.write(`dispatch failed: ${result.error.message}\n`)
    process.exit(2)
  }

  const output = result.stdout.trim()
  const data = output ? JSON.parse(output).hookSpecificOutput : {}
  const decision = data.permissionDecision || 'allow'

  if (data.permissionDecisionReason)
    process.stdout.write(`${decision}: ${data.permissionDecisionReason}\n`)
  if (data.additionalContext) process.stdout.write(`${data.additionalContext}\n`)

  if (decision === 'deny') process.exit(2)
  if (decision === 'ask') process.exit(3)
}

main()
