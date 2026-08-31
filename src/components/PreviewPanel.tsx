'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { Button, Spinner, Alert } from '@/components/ui'

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3005'

/**
 * Widths chosen from the devices in the analytics, not from round numbers:
 * 390 is the modal iPhone width, 768 the iPad portrait, and 1280 a laptop.
 */
const DEVICES = [
  { key: 'mobile', label: 'Ponsel', width: 390, icon: '▯' },
  { key: 'tablet', label: 'Tablet', width: 768, icon: '▭' },
  { key: 'desktop', label: 'Desktop', width: 1280, icon: '▬' },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

/**
 * Renders the page being edited — including unsaved changes — by asking the API
 * for a short-lived preview token and pointing an iframe at the landing page's
 * own route for it.
 *
 * The preview therefore runs the real components against the real data. A
 * re-implementation inside the CMS would be quicker to build and would drift
 * from the live site precisely when it matters: the moment before publishing.
 */
export function PreviewPanel({
  pageId, draft, onClose,
}: {
  pageId: string
  draft: { title: string; slug: string; seo: Record<string, string | boolean | undefined>; blocks: unknown[] }
  onClose: () => void
}) {
  const [device, setDevice] = useState<DeviceKey>('desktop')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Held in a ref so `refresh` can stay referentially stable while the editor
  // keeps typing — otherwise every keystroke would re-run the effect below.
  const draftRef = useRef(draft)
  draftRef.current = draft

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.post<{ data: { token: string } }>(`/pages/${pageId}/preview`, draftRef.current)
      setToken(r.data.token)
      setRefreshedAt(new Date())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => { void refresh() }, [refresh])

  // Escape closes, matching every other overlay in the CMS.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const width = DEVICES.find((d) => d.key === device)!.width
  const url = token ? `${LP}/pratinjau/${token}` : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-900/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pratinjau halaman">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
        <h2 className="font-bold text-ink-900">Pratinjau</h2>

        <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label="Ukuran layar">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              aria-pressed={device === d.key}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                device === d.key ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {d.label}
              <span className="ml-1.5 tabular-nums opacity-60">{d.width}</span>
            </button>
          ))}
        </div>

        <span className="ml-auto flex items-center gap-3">
          {refreshedAt ? (
            <span className="text-xs tabular-nums text-ink-400">
              Diperbarui {refreshedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Memuat…' : 'Muat ulang'}
          </Button>
          {url ? (
            <Button size="sm" variant="secondary" onClick={() => window.open(url, '_blank', 'noopener')}>
              Buka di tab baru
            </Button>
          ) : null}
          <Button size="sm" onClick={onClose}>Tutup</Button>
        </span>
      </header>

      <div className="flex-1 overflow-auto bg-ink-100 p-4">
        {error ? (
          <div className="mx-auto max-w-lg pt-10"><Alert>{error}</Alert></div>
        ) : !url ? (
          <div className="pt-20"><Spinner label="Menyiapkan pratinjau…" /></div>
        ) : (
          <div className="mx-auto h-full bg-white shadow-lg transition-[max-width] duration-300" style={{ maxWidth: width }}>
            <iframe
              ref={iframeRef}
              src={url}
              title="Pratinjau halaman"
              className="h-full w-full"
              /* The preview is our own origin's sibling app, but it renders
                 editor-supplied content — keep it from reaching back in. */
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        )}
      </div>

      <footer className="border-t border-ink-200 bg-white px-4 py-2 text-center text-xs text-ink-500">
        Menampilkan perubahan yang belum disimpan. Tautan pratinjau berlaku 30 menit dan tidak terbaca mesin pencari.
      </footer>
    </div>
  )
}
