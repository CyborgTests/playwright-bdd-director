/* eslint-disable no-undef */
'use strict'

/** Warns when incoming text looks like a hardcoded secret. Warns, never blocks. */
const CHECKS = [
  {
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    label: 'JWT token'
  },
  {
    re: /-----BEGIN\s+(RSA\s+|EC\s+|PGP\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/,
    label: 'private key'
  },
  {
    re: /(api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token|password)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{16,}['"`]/i,
    label: 'hardcoded credential'
  },
  { re: /\b(ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/, label: 'GitHub token' },
  { re: /\bsk-[A-Za-z0-9_-]{20,}/, label: 'API secret key (sk-…)' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: 'AWS access key id' }
]

const SKIP = /(^|\/)(\.env(\.[\w-]+)?|node_modules\/.*)$/

module.exports = {
  name: 'check-secret-leak',
  kinds: ['edit'],
  events: ['PreToolUse'],
  run({ relPath, incoming }) {
    if (!incoming || SKIP.test(relPath)) return null
    const hits = CHECKS.filter((c) => c.re.test(incoming)).map((c) => c.label)
    if (hits.length === 0) return null
    return {
      context: `Possible secret in ${relPath}: ${hits.join(', ')}. Load secrets from env (.env, gitignored) or generate test data instead of committing them.`
    }
  }
}
