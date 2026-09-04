'use client'

import { mediaSrc as resolveMedia } from '@/contracts'

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

export const setToken = (t: string | null) => { accessToken = t }
export const getToken = () => accessToken

async function refresh(): Promise<boolean> {
  // Collapse concurrent 401s into a single refresh call.
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!res.ok) return false
      const json = (await res.json()) as { accessToken: string }
      accessToken = json.accessToken
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
  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
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
  const json = (await res.json().catch(() => ({}))) as { accessToken?: string; user?: AuthUser; error?: { message?: string } }
  if (!res.ok || !json.accessToken) throw new ApiError(res.status, json.error?.message ?? 'Gagal masuk.')
  accessToken = json.accessToken
  return json.user!
}

export async function logout() {
  await fetch(`${BASE}/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
  accessToken = null
}

/** Direct-to-storage upload: presign → PUT → confirm. */
export async function uploadFile(file: File, folder: 'media' | 'documents' = 'media', alt = '') {
  const presign = await api.post<{ data: { url: string; key: string; headers: Record<string, string> } }>('/media/presign', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
    folder,
  })

  const put = await fetch(presign.data.url, { method: 'PUT', body: file, headers: presign.data.headers })
  if (!put.ok) throw new ApiError(put.status, 'Gagal mengunggah berkas ke penyimpanan.')

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
    key: presign.data.key,
    filename: file.name,
    contentType: file.type,
    size: file.size,
    alt,
    ...dims,
  })
}

const LP_BASE = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3005'

/**
 * Image fields store object keys; the website proxies them while the bucket
 * stays private. The console lives on another origin, so previews resolve
 * against the website.
 */
export const mediaSrc = (value: string | null | undefined) =>
  resolveMedia(value, { proxyBase: LP_BASE, publicBase: process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL })
