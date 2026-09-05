/**
 * Where the public website lives, as far as the console is concerned.
 *
 * `??` was not enough: a hosting platform that has the variable declared but
 * empty hands the build an empty string, which `??` passes straight through.
 * The preview iframe then loaded a relative `/pratinjau/...`, which resolves
 * against the console's own origin — and the console sends X-Frame-Options:
 * DENY, so the editor saw "refused to connect" naming the console itself, with
 * nothing to suggest a missing setting.
 */
const RAW = process.env.NEXT_PUBLIC_LP_URL

export const LP_URL = (RAW ?? '').trim().replace(/\/+$/, '') || 'http://localhost:3000'

/** True when the setting points back at the console, which can never be framed. */
export function pointsAtSelf(origin: string): boolean {
  try {
    return new URL(LP_URL, origin).origin === new URL(origin).origin
  } catch {
    return false
  }
}
