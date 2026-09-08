'use client'

import { mediaSrc as resolveMedia } from '@/contracts'
import { LP_URL } from './site'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

export interface AuthUser {
  sub: string
  name: string
  email: string
  permissions: string[]
  roles: string[]
  branchIds: string[]
}

/**
 * Access token lives in memory only — never in localStorage, where any injected
 * script could read it. The httpOnly refresh cookie is what survives a reload.
 */
let accessToken: string | null = null
let refreshing: Promise<boolean> | null = null

/**
 * The session's signing key, also memory-only. Every authenticated request is
 * signed with it, so an access token that leaks on its own opens nothing, and
 * a captured request cannot be replayed with another body or after two minutes.
 */
let signingKey: string | null = null
let signingMode: 'required' | 'optional' | 'off' = 'required'
let sessionId: string | null = null

export interface SessionEnvelope {
  accessToken: string
  user: AuthUser
  expiresIn: number
  session?: { id: string; signingKey: string; signing: 'required' | 'optional' | 'off'; idleMinutes: number; mfa: boolean }
  mfaEnabled?: boolean
  mfaSetupRequired?: boolean
}

function adopt(json: SessionEnvelope) {
  accessToken = json.accessToken
  if (json.session) { signingKey = json.session.signingKey; signingMode = json.session.signing; sessionId = json.session.id }
}

export const setToken = (t: string | null) => { accessToken = t }
export const getToken = () => accessToken
export const currentSessionId = () => sessionId

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** HMAC-SHA256 over method, path+query, timestamp, nonce and the body's SHA-256 — what the API recomputes. */
async function signHeaders(method: string, pathWithQuery: string, body?: string | ArrayBuffer): Promise<Record<string, string>> {
  if (!signingKey || signingMode === 'off' || typeof crypto === 'undefined' || !crypto.subtle) return {}
  const ts = String(Date.now())
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const bytes = body === undefined ? new Uint8Array() : typeof body === 'string' ? enc.encode(body) : new Uint8Array(body)
  const bodyHash = hex(await crypto.subtle.digest('SHA-256', bytes))
  const canonical = `${method.toUpperCase()}\n${pathWithQuery}\n${ts}\n${nonce}\n${bodyHash}`
  const key = await crypto.subtle.importKey('raw', enc.encode(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = b64url(await crypto.subtle.sign('HMAC', key, enc.encode(canonical)))
  return { 'x-req-ts': ts, 'x-req-nonce': nonce, 'x-req-sig': sig }
}

async function refresh(): Promise<boolean> {
  // Collapse concurrent 401s into a single refresh call.
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!res.ok) return false
      adopt((await res.json()) as SessionEnvelope)
      return true
    } catch {
      return false
    } finally {
      setTimeout(() => { refreshing = null }, 0)
    }
  })()
  return refreshing
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: { field: string; message: string }[]) {
    super(message)
  }
}

/** The dashboard shows an error rather than spinning forever on a stalled API. */
const REQUEST_TIMEOUT_MS = 20000

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const method = init.method ?? 'GET'
  const signature = accessToken ? await signHeaders(method, `/v1${path}`, typeof init.body === 'string' ? init.body : undefined) : {}
  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...signature,
      ...init.headers,
    },
  })

  if (res.status === 401 && retry) {
    if (await refresh()) return request<T>(path, init, false)
    accessToken = null
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
    }
    throw new ApiError(401, 'Sesi Anda telah berakhir.')
  }

  if (res.status === 204) return undefined as T

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; details?: { field: string; message: string }[] }
  }
  if (!res.ok) throw new ApiError(res.status, json.error?.message ?? 'Terjadi kesalahan.', json.error?.details)
  return json as T
}

/**
 * Download a file the API generates.
 *
 * It cannot go through `request`, which parses JSON, but it still has to carry
 * the session signature: an unsigned GET is rejected outright, which is why the
 * export button used to fail with nothing to show for it.
 */
export async function download(path: string, filename: string, retry = true): Promise<void> {
  const res = await fetch(`${BASE}/v1${path}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(60000),
    headers: {
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(accessToken ? await signHeaders('GET', `/v1${path}`) : {}),
    },
  })

  if (res.status === 401 && retry && (await refresh())) return download(path, filename, false)
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new ApiError(res.status, json.error?.message ?? 'Berkas gagal diunduh.')
  }

  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Revoking straight away can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T,>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  refresh,
  baseUrl: BASE,
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = (await res.json().catch(() => ({}))) as Partial<SessionEnvelope> & { mfaRequired?: boolean; challenge?: string; error?: { message?: string } }
  if (!res.ok) throw new ApiError(res.status, json.error?.message ?? 'Gagal masuk.')
  // A second factor set up on the account: no session yet, only a five-minute challenge.
  if (json.mfaRequired && json.challenge) return { mfaRequired: true as const, challenge: json.challenge }
  if (!json.accessToken) throw new ApiError(res.status, 'Gagal masuk.')
  adopt(json as SessionEnvelope)
  return { mfaRequired: false as const, user: json.user!, mfaSetupRequired: Boolean(json.mfaSetupRequired) }
}

/** The second step of signing in: the authenticator's code, or a recovery code. */
export async function loginMfa(challenge: string, code: string) {
  const res = await fetch(`${BASE}/v1/auth/login/mfa`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challenge, code }),
  })
  const json = (await res.json().catch(() => ({}))) as Partial<SessionEnvelope> & { recoveryCodesLeft?: number; error?: { message?: string } }
  if (!res.ok || !json.accessToken) throw new ApiError(res.status, json.error?.message ?? 'Kode tidak valid.')
  adopt(json as SessionEnvelope)
  return { user: json.user!, recoveryCodesLeft: json.recoveryCodesLeft, mfaSetupRequired: Boolean(json.mfaSetupRequired) }
}

export async function logout() {
  await fetch(`${BASE}/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
  accessToken = null
  signingKey = null
  sessionId = null
}

/* ------------------------------ account security ----------------------------- */

export interface SecurityState {
  user: AuthUser
  mfaEnabled: boolean
  mfaSetupRequired: boolean
  mfaVerifiedAt: string | null
  recoveryCodesLeft: number
  passwordChangedAt: string | null
  session: { id: string; mfa: boolean; idleMinutes: number }
}
export interface SessionRow { id: string; label: string; ip: string | null; createdAt: string; lastSeenAt: string | null; expiresAt: string; mfa: boolean; current: boolean }

export const security = {
  me: () => api.get<SecurityState>('/auth/me'),
  mfaSetup: () => api.post<{ data: { secret: string; uri: string; issuer: string; account: string } }>('/auth/mfa/setup'),
  mfaEnable: (code: string) => api.post<{ ok: true; recoveryCodes: string[] }>('/auth/mfa/enable', { code }),
  mfaDisable: (password: string, code: string) => api.post<{ ok: true }>('/auth/mfa/disable', { password, code }),
  mfaRecoveryCodes: (code: string) => api.post<{ ok: true; recoveryCodes: string[] }>('/auth/mfa/recovery-codes', { code }),
  sessions: () => api.get<{ data: SessionRow[] }>('/auth/sessions'),
  endSession: (id: string) => api.del<{ ok: true; current: boolean }>(`/auth/sessions/${id}`),
  endOtherSessions: () => api.del<{ ok: true; ended: number }>('/auth/sessions'),
  changePassword: (currentPassword: string, newPassword: string) => api.post<{ ok: true }>('/auth/change-password', { currentPassword, newPassword }),
}

/**
 * Documents (PDF, DOC) go straight to storage and are referenced by key from
 * the `documents` table, so unlike an image they never enter the media library.
 */
export async function uploadDocument(file: File) {
  const problem = uploadProblem(file, 'file')
  if (problem) throw new ApiError(413, problem)
  const saved = await putThroughApi(file, 'documents')
  return { ...saved, filename: file.name }
}

/**
 * Send the bytes to the API and let it write them to storage.
 *
 * A presigned PUT straight from the browser needs a CORS rule on the bucket;
 * without one the browser blocks the request before it leaves, and every upload
 * fails with nothing in the network log but a CORS error.
 */
async function putThroughApi(file: File, folder: 'media' | 'documents') {
  // The signature covers the file's bytes, so the upload cannot be swapped in flight.
  const bytes = await file.arrayBuffer()
  const res = await fetch(`${BASE}/v1/media/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-filename': encodeURIComponent(file.name).replace(/%20/g, ' '),
      'x-folder': folder,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(await signHeaders('POST', '/v1/media/upload', bytes)),
    },
    body: bytes,
  })
  const json = (await res.json().catch(() => ({}))) as { data?: { key: string; size: number }; error?: { message?: string } }
  if (!res.ok || !json.data) throw new ApiError(res.status, json.error?.message ?? 'Gagal mengunggah berkas.')
  return json.data
}

/*
 * Size limits, checked before a byte leaves the browser and again by the API.
 * A 2 MB photo is already larger than any page needs; a 5 MB PDF is a full
 * annual report. Anything bigger slows every visitor down.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_FILE_BYTES = 5 * 1024 * 1024
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n % (1024 * 1024) ? 1 : 0)} MB`

/** The reason a file cannot be uploaded, or null when it can. */
export function uploadProblem(file: File, kind: 'image' | 'file'): string | null {
  if (kind === 'image' && !file.type.startsWith('image/')) return `${file.name}: bukan berkas gambar.`
  const max = file.type.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
  if (file.size > max) return `${file.name}: ${mb(file.size)}, melebihi batas ${mb(max)} untuk ${file.type.startsWith('image/') ? 'gambar' : 'berkas'}.`
  return null
}

/** Direct-to-storage upload: presign → PUT → confirm. */
export async function uploadFile(file: File, folder: 'media' | 'documents' = 'media', alt = '') {
  const problem = uploadProblem(file, folder === 'media' ? 'image' : 'file')
  if (problem) throw new ApiError(413, problem)
  const saved = await putThroughApi(file, folder)

  // Reading intrinsic dimensions client-side avoids an image library on the server.
  const dims = await new Promise<{ width?: number; height?: number }>((resolve) => {
    if (!file.type.startsWith('image/')) return resolve({})
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve({}); URL.revokeObjectURL(url) }
    img.src = url
  })

  return api.post<{ data: { id: string; key: string; url: string } }>('/media/confirm', {
    key: saved.key,
    filename: file.name,
    contentType: file.type,
    size: file.size,
    alt,
    ...dims,
  })
}

const LP_BASE = LP_URL

/**
 * Image fields store object keys; the website proxies them while the bucket
 * stays private. The console lives on another origin, so previews resolve
 * against the website.
 */
export const mediaSrc = (value: string | null | undefined) =>
  resolveMedia(value, { proxyBase: LP_BASE, publicBase: process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL })

/**
 * The same image, resized for a preview.
 *
 * A cell in the media table is forty pixels wide and was being filled with the
 * original upload — a 2 MB photograph shrunk by the browser, twenty of them at
 * once on one screen. That is what made the library slow to open and, when the
 * proxy buckled under the twenty parallel downloads, left thumbnails broken
 * until someone reloaded them by hand.
 *
 * The website's image optimiser already resizes anything on its own origin, so
 * a preview asks it for the width it is actually drawn at. `width` is the CSS
 * width; the value sent is doubled and rounded to one of Next's configured
 * sizes so the picture stays sharp on a retina screen.
 *
 * Falls back to the full image for anything the optimiser cannot reach — an
 * absolute URL on the storage host, or a bucket serving its own public files.
 */
export function mediaThumb(value: string | null | undefined, width: number): string {
  const src = mediaSrc(value)
  if (!src.startsWith(LP_BASE) || !src.includes('/api/media/')) return src
  const path = src.slice(LP_BASE.length)
  const w = [16, 32, 48, 64, 96, 128, 256, 384].find((n) => n >= width * 2) ?? 384
  return `${LP_BASE}/_next/image?url=${encodeURIComponent(path)}&w=${w}&q=75`
}
