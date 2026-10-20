#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

/**
 * Bridges .claude/skills -> .agents/skills: NTFS junction on Windows (no admin rights
 * needed), relative directory symlink on POSIX. Claude Code discovers skills only under
 * .claude/skills/, while .agents/skills/ is the single source of truth for every tool.
 *
 *   node scripts/ensure-skills-link.js           create/repair, exit 1 on failure
 *   node scripts/ensure-skills-link.js --soft    same, but never fails (postinstall)
 *   node scripts/ensure-skills-link.js --check   read-only: exit 1 if missing/wrong
 */
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const targetDir = path.join(repoRoot, '.agents', 'skills')
const linkDir = path.join(repoRoot, '.claude', 'skills')

function isLinked() {
  try {
    return fs.realpathSync(linkDir) === fs.realpathSync(targetDir)
  } catch {
    return false
  }
}

function ensureSkillsLink() {
  if (!fs.existsSync(targetDir)) {
    process.stderr.write(`[skills-link] target not found: ${targetDir}\n`)
    return false
  }
  if (isLinked()) return true

  try {
    const stat = fs.lstatSync(linkDir, { throwIfNoEntry: false })
    if (
      stat &&
      (stat.isSymbolicLink() || (stat.isDirectory() && fs.readdirSync(linkDir).length === 0))
    ) {
      fs.rmSync(linkDir, { recursive: false, force: true })
    } else if (stat) {
      process.stderr.write(
        `[skills-link] ${linkDir} is a real, non-empty directory — move its content to .agents/skills first\n`
      )
      return false
    }
    fs.mkdirSync(path.dirname(linkDir), { recursive: true })
    if (process.platform === 'win32') {
      fs.symlinkSync(targetDir, linkDir, 'junction')
    } else {
      fs.symlinkSync(path.join('..', '.agents', 'skills'), linkDir, 'dir')
    }
    process.stdout.write('[skills-link] linked .claude/skills -> .agents/skills\n')
    return true
  } catch (err) {
    process.stderr.write(`[skills-link] failed: ${err.message}\n`)
    return false
  }
}

if (require.main === module) {
  const flag = process.argv[2]
  if (flag === '--check') {
    process.exit(isLinked() ? 0 : 1)
  }
  const ok = ensureSkillsLink()
  process.exit(ok || flag === '--soft' ? 0 : 1)
}

module.exports = { ensureSkillsLink, isLinked }
