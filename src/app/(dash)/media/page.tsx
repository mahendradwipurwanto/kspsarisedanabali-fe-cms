'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageOff, LayoutGrid, Rows3, Upload, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { api, uploadFile, uploadProblem, mediaSrc, ApiError, MAX_IMAGE_BYTES } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Spinner, Empty, Button, Alert, inputCls, Badge, Segmented } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { RecordSheet, recordValues } from '@/components/RecordSheet'
import { buildColumns, defaultHidden, fieldText, type TableField } from '@/components/fields'
import { LP_URL as LP } from '@/lib/site'

interface MediaItem {
  id: string; key: string; url: string; filename: string
  alt?: string | null; caption?: string | null
  size: number; width?: number | null; height?: number | null; createdAt?: string
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

const FIELDS: TableField<MediaItem>[] = [
  { key: 'filename', label: 'Berkas', type: 'text', readOnly: true, secondary: (r) => (r.width ? `${r.width} × ${r.height} · ${kb(r.size)}` : kb(r.size)) },
  {
    key: 'url', label: 'Gambar', type: 'image', width: 90, readOnly: true, panelOnly: false,
    render: (r) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaSrc(r.url)} alt={r.alt ?? ''} className="size-10 rounded-[6px] border border-line object-cover" loading="lazy" />
    ),
  },
  {
    key: 'alt', label: 'Keterangan (alt)', type: 'text',
    hint: 'Dibaca Google dan pembaca layar. Jelaskan isi gambar, bukan nama berkasnya.',
    render: (r) => (r.alt ? <span className="line-clamp-2 max-w-[46ch] text-ink-700">{r.alt}</span> : <Badge variant="warning">alt kosong</Badge>),
  },
  { key: 'caption', label: 'Caption', type: 'text' },
  { key: 'key', label: 'Kunci objek', type: 'readonly', hiddenByDefault: true },
]

export default function MediaPage() {
  const { can } = useAuth()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'gallery' | 'table'>('table')
  const [record, setRecord] = useState<{ row: MediaItem; values: Record<string, unknown> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [sheetError, setSheetError] = useState('')

  const canWrite = can('media:upload')

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

  const missingAlt = items.filter((m) => !m.alt).length

  const openRow = useCallback((row: MediaItem) => { setSheetError(''); setRecord({ row, values: recordValues(FIELDS, row) }) }, [])

  const remove = useCallback(async (row: MediaItem) => {
    if (!window.confirm(`Hapus ${row.filename}? Halaman yang memakainya akan kehilangan gambar ini.`)) return
    try {
      await api.del(`/media/${row.id}`)
      setItems((list) => list.filter((m) => m.id !== row.id))
      toast.success('Gambar dihapus')
    } catch (e) {
      toast.error('Gagal menghapus', { description: (e as Error).message })
    }
  }, [])

  const columns = useMemo(
    () => buildColumns<MediaItem>({
      fields: FIELDS,
      canWrite,
      selectable: false,
      onEdit: openRow,
      editLabel: canWrite ? 'Ubah keterangan' : 'Lihat',
      onDelete: can('media:delete') ? (row) => void remove(row) : undefined,
      extraActions: [
        { label: 'Buka gambar', icon: <ExternalLink className="size-3.5" />, onSelect: (row) => window.open(mediaSrc(row.url).startsWith('http') ? mediaSrc(row.url) : `${LP}${mediaSrc(row.url)}`, '_blank', 'noopener') },
      ],
    }),
    [canWrite, can, openRow, remove],
  )

  async function onPick(files: File[]) {
    if (!files.length) return
    // Oversized or non-image files are named and skipped before anything is
    // sent, so one bad file does not stop the rest of a batch.
    const rejected = files.map((f) => uploadProblem(f, 'image')).filter((p): p is string => Boolean(p))
    const accepted = files.filter((f) => !uploadProblem(f, 'image'))
    setError(rejected.join(' '))
    if (!accepted.length) return
    setBusy(true)
    const failed: string[] = []
    let done = 0
    for (const file of accepted) {
      try { await uploadFile(file, 'media', alt.trim()); done++ } catch (e) { failed.push(`${file.name}: ${(e as Error).message}`) }
    }
    setBusy(false)
    if (done) setAlt('')
    await load()
    if (failed.length) setError([...rejected, ...failed].join(' '))
    if (done) toast.success(done === 1 ? 'Gambar terunggah' : `${done} gambar terunggah`, { description: alt.trim() ? undefined : 'Keterangan (alt) bisa diisi dari tabel di bawah.' })
  }

  async function save() {
    if (!record) return
    setSaving(true)
    setSheetError('')
    try {
      await api.patch(`/media/${record.row.id}`, { alt: record.values.alt ?? '', caption: record.values.caption ?? '' })
      setRecord(null)
      await load()
      toast.success('Keterangan tersimpan')
    } catch (err) {
      const e = err as ApiError
      setSheetError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Media"
        subtitle="Gambar yang dipakai di seluruh halaman website."
        action={
          <Segmented
            ariaLabel="Tampilan"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'table', label: <span className="inline-flex items-center gap-1.5"><Rows3 className="size-3.5" /> Tabel</span> },
              { value: 'gallery', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="size-3.5" /> Galeri</span> },
            ]}
          />
        }
      />

      {missingAlt > 0 ? (
        <div className="mb-4">
          <Alert tone="amber">
            {missingAlt} gambar belum punya keterangan (alt). Google dan pembaca layar tidak bisa memahami isinya.
            {mode === 'gallery' ? ' Buka tampilan Tabel untuk melengkapinya.' : ' Pakai tindakan “Ubah keterangan” pada barisnya.'}
          </Alert>
        </div>
      ) : null}

      {canWrite ? (
        <Card className="mb-4 p-4">
          <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Keterangan gambar (opsional), contoh: Kantor Cabang Rendang tampak depan"
              aria-label="Keterangan gambar baru"
              className={inputCls}
            />
            <label className={`inline-flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-input)] bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload className="size-4" aria-hidden="true" />
              {busy ? 'Mengunggah…' : 'Unggah gambar'}
              <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} aria-label="Pilih berkas gambar" onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void onPick(files) }} />
            </label>
          </div>
          <p className="mt-2 text-[12px] text-ink-400">Bisa memilih beberapa gambar sekaligus, masing-masing maksimal {MAX_IMAGE_BYTES / 1024 / 1024} MB. Keterangan yang diisi di sini dipakai untuk semua gambar yang diunggah.</p>
          {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
        </Card>
      ) : null}

      {loading ? (
        <Spinner />
      ) : mode === 'table' ? (
        <DataTable<MediaItem>
          columns={columns}
          data={items}
          storageKey="media"
        initialVisibility={defaultHidden(FIELDS)}
          searchPlaceholder="Cari nama berkas atau keterangan…"
          globalFilterFn={(row, _id, value) => {
            const q = String(value).toLowerCase()
            return FIELDS.some((f) => fieldText(row.original, f).toLowerCase().includes(q))
          }}
          onRowClick={openRow}
          emptyState={<Empty icon={<ImageOff className="size-5" />} title="Pustaka masih kosong" body="Unggah gambar untuk dipakai di banner, produk, dan berita." />}
        />
      ) : items.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => openRow(m)} className="surface block w-full overflow-hidden text-left transition-colors hover:border-ink-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaSrc(m.url)} alt={m.alt ?? ''} className="aspect-[4/3] w-full bg-paper object-cover" loading="lazy" />
                <span className="block p-3">
                  <span className="block truncate text-[12.5px] font-semibold text-ink-800">{m.filename}</span>
                  <span className="mt-1 block truncate text-[11.5px] text-ink-500">{m.alt || 'Belum ada keterangan'}</span>
                  <span className="mt-2 flex items-center gap-1.5">
                    {m.alt ? <Badge variant="success">alt ok</Badge> : <Badge variant="warning">alt kosong</Badge>}
                    {m.width ? <span className="tnum text-[11px] text-ink-400">{m.width}×{m.height}</span> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<ImageOff className="size-5" />} title="Belum ada gambar" body="Unggah gambar untuk dipakai di banner, produk, dan berita." />
      )}

      <RecordSheet<MediaItem>
        open={record !== null}
        onOpenChange={(open) => { if (!open) setRecord(null) }}
        fields={FIELDS}
        values={record?.values ?? {}}
        onChange={(values) => setRecord((r) => (r ? { ...r, values } : r))}
        onSave={() => void save()}
        title={record?.row.filename ?? 'Media'}
        subtitle={record?.row.key}
        busy={saving}
        canWrite={canWrite}
        error={sheetError}
        note={
          record ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(record.row.url)} alt={record.row.alt ?? ''} className="w-full rounded-[var(--radius-card)] border border-line object-contain" />
          ) : null
        }
      />
    </>
  )
}
