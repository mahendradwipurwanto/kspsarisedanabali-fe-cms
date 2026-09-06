'use client'

/**
 * Encrypted browser storage.
 *
 * Anything the console keeps in the browser between sessions goes through
 * here: AES-256-GCM with a key that lives in IndexedDB as a non-extractable
 * CryptoKey, so what sits in localStorage is ciphertext and the key itself
 * can never be read out as bytes, only used. It is a floor, not a wall — a
 * script running on the page can still ask the key to decrypt — which is
 * why nothing secret (tokens, keys) is stored in the browser at all; those
 * stay in memory and in the httpOnly cookie.
 */
const DB = 'ksp-secure', STORE = 'keys', KEY_ID = 'device-v1', PREFIX = 'enc1:'

let keyPromise: Promise<CryptoKey | null> | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function deviceKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.indexedDB) return null
  keyPromise ??= (async () => {
    try {
      const db = await openDb()
      const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(KEY_ID)
        r.onsuccess = () => resolve(r.result as CryptoKey | undefined); r.onerror = () => reject(r.error)
      })
      if (existing) return existing
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(key, KEY_ID)
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
      })
      return key
    } catch {
      return null
    }
  })()
  return keyPromise
}

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function encrypt(plain: string): Promise<string | null> {
  const key = await deviceKey()
  if (!key) return null
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const body = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  return `${PREFIX}${b64(iv)}.${b64(body)}`
}

async function decrypt(stored: string): Promise<string | null> {
  if (!stored.startsWith(PREFIX)) return null
  const key = await deviceKey()
  if (!key) return null
  try {
    const [iv, body] = stored.slice(PREFIX.length).split('.')
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv!) }, key, unb64(body!))
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}

function backend(kind: 'local' | 'session'): Storage | null {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage } catch { return null }
}

/** Read a value; a legacy plain-text entry is migrated to ciphertext on first read. */
export async function secureGet<T>(name: string, kind: 'local' | 'session' = 'local'): Promise<T | null> {
  const store = backend(kind)
  if (!store) return null
  const raw = store.getItem(name)
  if (raw == null) return null
  if (raw.startsWith(PREFIX)) {
    const plain = await decrypt(raw)
    if (plain == null) { store.removeItem(name); return null }
    try { return JSON.parse(plain) as T } catch { return null }
  }
  // Written before encryption existed: keep the value, rewrite it sealed.
  try {
    const value = JSON.parse(raw) as T
    await secureSet(name, value, kind)
    return value
  } catch {
    store.removeItem(name)
    return null
  }
}

/** Write a value as ciphertext. Where the crypto is unavailable, nothing is written. */
export async function secureSet(name: string, value: unknown, kind: 'local' | 'session' = 'local'): Promise<void> {
  const store = backend(kind)
  if (!store) return
  const sealed = await encrypt(JSON.stringify(value))
  if (sealed) store.setItem(name, sealed)
  else store.removeItem(name)
}

export function secureRemove(name: string, kind: 'local' | 'session' = 'local') {
  backend(kind)?.removeItem(name)
}
