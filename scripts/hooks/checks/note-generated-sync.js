/* eslint-disable no-undef */
'use strict'

/** Reminds that parts of these files are owned by `npm run stage` / `npm run autogen`. */
module.exports = {
  name: 'note-generated-sync',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath, incoming, previous }) {
    if (/^tests\/cyborg\/.+\.ts$/.test(relPath)) {
      return {
        context:
          'tests/cyborg/** titles and test.step() names are synced from test-suites/<base>.md by `npm run stage`. Change wording in the MD and re-run stage; step bodies (fixtures, manualStep) are hand-written. See the md-driven-suites skill.'
      }
    }
    if (/^tests\/automated\/todo\//.test(relPath)) {
      return {
        context:
          'tests/automated/todo/** holds generated AUTO skeletons that `npm run stage` rewrites while empty. Move the file to tests/automated/<api|ui|e2e>/ before implementing it — see the md-to-automated skill.'
      }
    }
    if (relPath === 'src/test-constants/tags.ts' && /\bSUITE\b/.test(`${incoming}\n${previous}`)) {
      return {
        context:
          "TAG.SUITE entries are added by `npm run stage` from test-suites/*.md file names — don't hand-add an entry stage will generate; edit only non-MD-backed suites."
      }
    }
    return null
  }
}
