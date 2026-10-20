#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

/**
 * Cross-platform launcher for the Playwright MCP server used by AI tools
 * (.mcp.json, .codex/config.toml, .devin/mcp_config.json, .claude/agents/*).
 *
 * Uses a locally installed @playwright/mcp when present, otherwise falls back to
 * `npx -y @playwright/mcp@latest` through a shell — plain `npx` cannot be spawned
 * directly on native Windows (it is npx.cmd), which breaks MCP configs there.
 * stdio is inherited: the MCP protocol flows straight through this process.
 */
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const localCli = path.join(repoRoot, 'node_modules', '@playwright', 'mcp', 'cli.js')
const args = [
  '--config',
  path.join(repoRoot, 'playwright-mcp.config.json'),
  ...process.argv.slice(2)
]

function quote(arg) {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg
}

const child = fs.existsSync(localCli)
  ? spawn(process.execPath, [localCli, ...args], { cwd: repoRoot, stdio: 'inherit' })
  : spawn(['npx', '-y', '@playwright/mcp@latest', ...args].map(quote).join(' '), {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true
    })

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code) => process.exit(code ?? 0))
