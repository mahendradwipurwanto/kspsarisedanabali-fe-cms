'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImageOff, LayoutGrid, Rows3, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { api, uploadFile, mediaSrc } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Spinner, Empty, Button, Alert, inputCls, Pill, Segmented } from '@/components/ui'
import { DataGrid, useGridRows, useGridView, type GridField } from '@/components/DataGrid'
import { GridToolbar } from '@/components/GridToolbar'

interface MediaItem {
  id: string; key: string; url: string; filename: string
  alt?: string | null; caption?: string | null
  size: number; width?: number | null; height?: number | null; createdAt?: string
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

const FIELDS: GridField<MediaItem>[] = [
  {
    key: 'url', label: 'Gambar', type: 'image', width: 80, readOnly: true,
    render: (r) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaSrc(r.url)} alt={r.alt ?? ''} className="size-7 rounded-[4px] border border-line object-cover" loading="lazy" />
    ),
  },
  { key: 'filename', label: 'Nama berkas', type: 'text', width: 260, readOnly: true },
  { key: 'alt', label: 'Keterangan (alt)', type: 'text', width: 340, hint: 'Dibaca Google dan pembaca layar. Jelaskan isi gambar, bukan nama berkasnya.' },
  { key: 'caption', label: 'Caption', type: 'text', width: 240 },
  { key: 'dimensions', label: 'Ukuran piksel', type: 'readonly', width: 140, get: (r) => (r.width ? `${r.width} × ${r.height}` : '') },
  { key: 'size', label: 'Berat', type: 'readonly', width: 110, get: (r) => kb(r.size) },
  { key: 'key', label: 'Kunci objek', type: 'readonly', width: 320 },
]

export default function MediaPage() {
  const { can } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'gallery' | 'grid'>('gallery')
  const [query, setQuery] = useState('')
  const view = useGridView('media')

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: MediaItem[] }>('/media?limit=200')
      setItems(r.data)
    } catch (e) {
      toast.error('Gagal memuat media', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useGridRows(items, FIELDS, query, view.sort)
  // Derived, so fixing an alt in the grid updates the warning immediately.
  const missingAlt = items.filter((m) => !m.alt).length
  const canWrite = can('media:upload')

  async function onPick(file: File) {
    if (!alt.trim()) return setError('Isi keterangan gambar (alt) terlebih dahulu. Ini wajib agar Google memahami isi gambar.')
    setBusy(true)
    setError('')
    try {
      await uploadFile(file, 'media', alt.trim())
      setAlt('')
      await load()
      toast.success('Gambar terunggah')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function editCell(rowId: string, key: string, value: unknown) {
    const before = items.find((m) => m.id === rowId)
    if (!before) return
    const previous = (before as unknown as Record<string, unknown>)[key]
    setItems((list) => list.map((m) => (m.id === rowId ? { ...m, [key]: value } : m)))
    try {
      await api.patch(`/media/${rowId}`, { [key]: value })
    } catch (e) {
      setItems((list) => list.map((m) => (m.id === rowId ? { ...m, [key]: previous } : m)))
      toast.error('Perubahan tidak tersimpan', { description: (e as Error).message })
    }
  }

  return (
    <>
      <PageHeader
        title="Media"
        subtitle="Gambar yang dipakai di seluruh halaman website. Keterangan (alt) bisa diperbaiki langsung di tabel."
        action={
          <Segmented
            ariaLabel="Tampilan"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'gallery', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="size-3.5" /> Galeri</span> },
              { value: 'grid', label: <span className="inline-flex items-center gap-1.5"><Rows3 className="size-3.5" /> Tabel</span> },
            ]}
          />
        }
      />

      {missingAlt > 0 ? (
        <div className="mb-4">
          <Alert tone="amber">
            {missingAlt} gambar belum punya keterangan (alt). Google dan pembaca layar tidak bisa memahami isinya.
            {mode === 'gallery' ? ' Buka tampilan Tabel untuk mengisinya sekaligus.' : ' Klik kolom “Keterangan (alt)” untuk mengisinya.'}
          </Alert>
        </div>
      ) : null}

      {canWrite ? (
        <Card className="mb-4 p-4">
          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Keterangan gambar, contoh: Kantor Cabang Rendang tampak depan"
              aria-label="Keterangan gambar baru"
              className={inputCls}
            />
            <label className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-[var(--radius-input)] bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload className="size-4" aria-hidden="true" />
              {busy ? 'Mengunggah…' : 'Unggah gambar'}
              <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f) }} />
            </label>
          </div>
          {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
        </Card>
      ) : null}

      {loading ? (
        <Spinner />
      ) : mode === 'grid' ? (
        <>
          <GridToolbar fields={FIELDS} view={view} query={query} onQuery={setQuery} />
          <DataGrid<MediaItem>
            fields={FIELDS}
            rows={visible}
            rowHeight={view.rowHeight}
            hidden={view.hidden}
            widths={view.widths}
            onWidths={view.setWidths}
            sort={view.sort}
            onSort={view.setSort}
            canWrite={can('media:update') || canWrite}
            onEdit={({ rowId, key, value }) => void editCell(rowId, key, value)}
            emptyState={<Empty icon={<ImageOff className="size-5" />} title="Pustaka masih kosong" body="Unggah gambar untuk dipakai di banner, produk, dan berita." />}
          />
        </>
      ) : items.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaSrc(m.url)} alt={m.alt ?? ''} className="aspect-[4/3] w-full bg-paper object-cover" loading="lazy" />
              <div className="p-3">
                <p className="truncate text-[12.5px] font-semibold text-ink-800">{m.filename}</p>
                <p className="mt-1 truncate text-[11.5px] text-ink-500">{m.alt || 'Belum ada keterangan'}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {m.alt ? <Pill tone="green">alt ok</Pill> : <Pill tone="amber">alt kosong</Pill>}
                  {m.width ? <span className="tnum text-[11px] text-ink-400">{m.width}×{m.height}</span> : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <Empty icon={<ImageOff className="size-5" />} title="Belum ada gambar" body="Unggah gambar untuk dipakai di banner, produk, dan berita." />
      )}
    </>
  )
}
