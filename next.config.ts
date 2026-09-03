import type { NextConfig } from 'next'
import { createRequire } from 'node:module'
import { dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pin Turbopack's workspace root to the directory that actually owns the
 * node_modules `next` resolves from.
 *
 * This app has its own `.git` and its own lockfile, so Turbopack would otherwise
 * treat the app directory as the root. That is right on Vercel, where the repo
 * is checked out alone and installs its own dependencies — but wrong during
 * monorepo development, where npm hoists `next` a level above and the build
 * fails with "Could not find the Next.js package".
 *
 * Resolving `next` and walking back to its node_modules parent gets both cases
 * right without guessing: it returns the monorepo root here and the app
 * directory once the repo stands alone. Earlier versions keyed off the nearest
 * lockfile, which broke the moment a per-repo lockfile was committed.
 */
const here = dirname(fileURLToPath(import.meta.url))
const require_ = createRequire(import.meta.url)

function nextPackageRoot(fallback: string): string {
  try {
    const resolved = require_.resolve('next/package.json')
    const marker = `${sep}node_modules${sep}`
    const at = resolved.lastIndexOf(marker)
    return at === -1 ? fallback : resolved.slice(0, at)
  } catch {
    return fallback
  }
}

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: nextPackageRoot(here) },
  poweredByHeader: false,
  // Next 16 otherwise writes AGENTS.md / CLAUDE.md into the repo on first dev run.
  agentRules: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The admin panel must never be indexed — it was a finding in the audit
          // that the old WordPress login sat at a guessable, crawlable URL.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

export default config
