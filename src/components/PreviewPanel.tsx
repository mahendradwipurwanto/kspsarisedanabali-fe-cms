'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, X, PlugZap } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Spinner, Alert, IconButton, Kbd } from '@/components/ui'

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3000'

/** Widths from the devices in the analytics: iPhone, iPad portrait, laptop. */
const DEVICES = [
  { key: 'mobile', label: 'Ponsel', width: 390, icon: Smartphone },
  { key: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
  { key: 'desktop', label: 'Desktop', width: 1280, icon: Monitor },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

/**
 * Renders the page being edited, unsaved changes included, by asking the API
 * for a short-lived preview token and pointing an iframe at the website's own
 * route for it. The preview runs the real components against the real data.
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
  /** null while the website has not been probed yet. */
  const [siteUp, setSiteUp] = useState<boolean | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const draftRef = useRef(draft)
  draftRef.current = draft

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The preview renders inside the website, so a stopped or misconfigured
      // website shows the browser's own error page inside the frame with no
      // explanation. Probe it first and say what is wrong.
      try {
        await fetch(LP, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(6000) })
        setSiteUp(true)
      } catch {
        setSiteUp(false)
        return
      }
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const width = DEVICES.find((d) => d.key === device)!.width
  const url = token ? `${LP}/pratinjau/${token}` : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950" role="dialog" aria-modal="true" aria-label="Pratinjau halaman">
      <header className="grid-dark flex flex-wrap items-center gap-3 border-b border-white/10 bg-ink-900 px-4 py-2.5 text-white">
        <h2 className="text-[14px] font-bold">Pratinjau</h2>
        <span className="mono hidden text-[11px] text-white/40 sm:inline">{draft.slug === '/' ? '/' : `/${draft.slug}`}</span>

        <div className="ml-2 flex rounded-[var(--radius-input)] border border-white/10 bg-white/[0.04] p-0.5" role="group" aria-label="Ukuran layar">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              aria-pressed={device === d.key}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                device === d.key ? 'bg-white text-ink-900' : 'text-white/60 hover:text-white'
              }`}
            >
              <d.icon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{d.label}</span>
              <span className="mono tnum text-[10px] opacity-60">{d.width}</span>
            </button>
          ))}
        </div>

        <span className="ml-auto flex items-center gap-2">
          {refreshedAt ? (
            <span className="mono hidden text-[11px] tabular-nums text-white/40 md:inline">
              diperbarui {refreshedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={loading} className="!border-white/15 !bg-white/[0.06] !text-white hover:!bg-white/10">
            <RefreshCw className="size-3.5" /> Muat ulang
          </Button>
          {url ? (
            <Button size="sm" variant="secondary" onClick={() => window.open(url, '_blank', 'noopener')} className="!border-white/15 !bg-white/[0.06] !text-white hover:!bg-white/10">
              <ExternalLink className="size-3.5" /> Tab baru
            </Button>
          ) : null}
          <IconButton label="Tutup pratinjau" onClick={onClose} className="text-white/70 hover:!bg-white/10 hover:!text-white"><X className="size-4" /></IconButton>
        </span>
      </header>

      <div className="scroll-thin flex-1 overflow-auto p-4">
        {siteUp === false ? (
          <div className="mx-auto max-w-lg pt-16 text-center text-white">
            <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-tile)] bg-white/10 text-gold-300">
              <PlugZap className="size-6" />
            </span>
            <h3 className="mt-4 text-[16px] font-bold">Website tidak bisa dihubungi</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
              Pratinjau ditampilkan di dalam website, tetapi tidak ada yang menjawab di{' '}
              <span className="mono text-white/80">{LP}</span>.
            </p>
            <ul className="mono mt-4 grid gap-1.5 text-left text-[12px] text-white/55">
              <li>1. Jalankan website: <span className="text-white/80">npm run dev</span> di folder kspsarisedanabali-fe-lp</li>
              <li>2. Pastikan NEXT_PUBLIC_LP_URL di konsol menunjuk alamat yang sama</li>
            </ul>
            <Button variant="secondary" className="mt-5 !border-white/15 !bg-white/[0.06] !text-white hover:!bg-white/10" onClick={() => void refresh()} loading={loading}>
              <RefreshCw className="size-3.5" /> Coba lagi
            </Button>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg pt-10"><Alert>{error}</Alert></div>
        ) : !url ? (
          <div className="pt-20 text-white/70"><Spinner label="Menyiapkan pratinjau…" /></div>
        ) : (
          <div className="mx-auto h-full overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-lift)] ring-1 ring-white/10 transition-[max-width] duration-300 [transition-timing-function:var(--ease-settle)]" style={{ maxWidth: width }}>
            <iframe
              ref={iframeRef}
              src={url}
              title="Pratinjau halaman"
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 bg-ink-900 px-4 py-2 text-center text-[11.5px] text-white/45">
        Menampilkan perubahan yang belum disimpan. Tautan berlaku 30 menit dan tidak terbaca mesin pencari.
        <span className="hidden items-center gap-1 sm:flex"><Kbd>Esc</Kbd> tutup</span>
      </footer>
    </div>
  )
}
