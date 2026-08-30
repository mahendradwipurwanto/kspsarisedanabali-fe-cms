'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, uploadFile } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Spinner, Empty, Button, Alert, inputCls, Pill } from '@/components/ui'

interface MediaItem { id: string; key: string; url: string; filename: string; alt?: string | null; size: number; width?: number | null; height?: number | null }

export default function MediaPage() {
  const { can } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [missingAlt, setMissingAlt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: MediaItem[]; missingAlt: number }>('/media?limit=60')
      setItems(r.data)
      setMissingAlt(r.missingAlt)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function onPick(file: File) {
    if (!alt.trim()) return setError('Isi keterangan gambar (alt) terlebih dahulu. Ini wajib agar Google memahami isi gambar.')
    setBusy(true); setError('')
    try { await uploadFile(file, 'media', alt.trim()); setAlt(''); await load() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Media" subtitle="Gambar yang dipakai di seluruh halaman website." />

      {missingAlt > 0 ? (
        <div className="mb-5"><Alert tone="amber">{missingAlt} gambar belum punya keterangan (alt). Google tidak bisa memahami isinya.</Alert></div>
      ) : null}

      {can('media:upload') ? (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 font-bold text-ink-900">Unggah gambar baru</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Keterangan gambar, contoh: Kantor Cabang Rendang tampak depan" className={inputCls} />
            <input type="file" accept="image/*" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f) }}
              className="rounded-lg border border-dashed border-ink-300 bg-ink-50 px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
          </div>
          {busy ? <p className="mt-2 text-sm text-ink-500">Mengunggah…</p> : null}
          {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
        </Card>
      ) : null}

      {loading ? <Spinner /> : items.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt ?? ''} className="aspect-[4/3] w-full object-cover" />
              <div className="p-3">
                <p className="truncate text-xs font-medium text-ink-800">{m.filename}</p>
                <p className="mt-1 truncate text-[11px] text-ink-500">{m.alt || 'Belum ada keterangan'}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {m.alt ? <Pill tone="green">alt ok</Pill> : <Pill tone="amber">alt kosong</Pill>}
                  {m.width ? <span className="text-[11px] text-ink-400">{m.width}×{m.height}</span> : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <Empty title="Belum ada gambar" body="Unggah gambar untuk dipakai di banner, produk, dan berita." />
      )}
    </>
  )
}
