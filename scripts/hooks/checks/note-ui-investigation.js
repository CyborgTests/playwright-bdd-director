/* eslint-disable no-undef */
'use strict'

/**
 * Nudges a live browser check before UI test / Page Object edits: writing UI code from
 * memory of old locators or a prior summary is the most common source of broken tests.
 * Never blocks — renames and comment fixes need no live pass.
 */
const UI_CODE = /^src\/(pages|steps)\/.+\.ts$/

module.exports = {
  name: 'note-ui-investigation',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath }) {
    if (!UI_CODE.test(relPath)) return null
    return {
      context: `${relPath} is step definition / Page Object code. If the change relies on DOM structure, copy or behavior not observed live in this session, run the ui-explorer skill (Playwright MCP) first instead of guessing from existing locators.`
    }
  }
}
