'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from './api'
import { toastSaved, type Refreshable } from './saved'

type Groups = Record<string, unknown>

/**
 * One hook for every settings screen. Loads the whole settings map once, lets
 * a screen edit the groups it owns, and saves only those groups back, so two
 * editors on different screens never overwrite each other's work.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Groups>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    void api.get<{ data: Groups }>('/settings')
      .then((r) => setSettings(r.data))
      .catch((e) => toast.error('Gagal memuat pengaturan', { description: (e as Error).message }))
      .finally(() => setLoading(false))
  }, [])

  const group = useCallback(<T,>(key: string, fallback: T): T => {
    const raw = settings[key]
    if (raw === undefined || raw === null) return fallback
    if (Array.isArray(fallback)) return (Array.isArray(raw) ? raw : fallback) as T
    if (typeof fallback === 'object') return { ...(fallback as object), ...(raw as object) } as T
    return raw as T
  }, [settings])

  const setGroup = useCallback((key: string, value: unknown) => {
    setSettings((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }, [])

  const save = useCallback(async (keys: string[], successText = 'Tersimpan') => {
    setSaving(true)
    try {
      const payload: Groups = {}
      for (const k of keys) if (settings[k] !== undefined) payload[k] = settings[k]
      const res = await api.put<Refreshable>('/settings', payload)
      setDirty(false)
      toastSaved(res, successText)
      return true
    } catch (e) {
      toast.error('Gagal menyimpan', { description: (e as Error).message })
      return false
    } finally {
      setSaving(false)
    }
  }, [settings])

  return { settings, loading, saving, dirty, group, setGroup, save }
}
