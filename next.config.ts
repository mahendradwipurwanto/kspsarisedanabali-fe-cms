import type { NextConfig } from 'next'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pin Turbopack's workspace root to whichever directory actually holds the
 * lockfile.
 *
 * This app has its own `.git`, so Turbopack treats the app directory as the
 * root — but during monorepo development `next` is hoisted to the parent, one
 * level above that boundary, and the build fails with "Could not find the
 * Next.js package". Walking up to the lockfile resolves to the monorepo root
 * here and to the app directory once the repo is checked out on its own, which
 * is how it is built on Vercel.
 */
const here = dirname(fileURLToPath(import.meta.url))
function lockfileRoot(from: string): string {
  let dir = from
  for (;;) {
    if (existsSync(join(dir, 'package-lock.json'))) return dir
    const up = dirname(dir)
    if (up === dir) return from
    dir = up
  }
}

const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: lockfileRoot(here) },
  poweredByHeader: false,
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
