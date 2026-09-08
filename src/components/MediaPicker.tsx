'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Upload, Search, Check, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import { api, uploadFile, uploadProblem, mediaThumb, MAX_IMAGE_BYTES } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Modal, Button, inputCls, Spinner, Empty, Pill } from './ui'

export interface MediaItem { id: string; key: string; url: string; filename: string; alt?: string | null; size: number; width?: number | null; height?: number | null }

/**
 * Pick an image from the library or upload new ones, without leaving the
 * form. Several files can go up at once; a caption typed beforehand is
 * applied to all of them and can be refined later under Media. A single
 * upload is picked straight away; a batch stays in the grid to choose from.
 */
export function MediaPicker({
  open, onClose, onSelect, value,
}: { open: boolean; onClose: () => void; onSelect: (item: MediaItem) => void; value?: string }) {
  const { can } = useAuth()
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [q, setQ] = useState('')
  const [alt, setAlt] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const busy = progress !== null

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: MediaItem[] }>('/media?limit=120')
      setItems(r.data)
    } catch (e) {
      toast.error('Gagal memuat media', { description: (e as Error).message })
      setItems([])
    }
  }, [])

  useEffect(() => { if (open && items === null) void load() }, [open, items, load])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!items) return []
    return term ? items.filter((m) => [m.filename, m.alt ?? ''].some((v) => v.toLowerCase().includes(term))) : items
  }, [items, q])

  async function onPick(files: File[]) {
    if (!files.length) return
    // Refuse what cannot go up before anything is sent, so one oversized
    // photo does not abort a batch of good ones.
    const rejected = files.map((f) => uploadProblem(f, 'image')).filter((p): p is string => Boolean(p))
    const accepted = files.filter((f) => !uploadProblem(f, 'image'))
    if (rejected.length) toast.warning(rejected.length === files.length ? 'Tidak ada yang bisa diunggah' : 'Sebagian berkas dilewati', { description: rejected.join(' '), duration: 8000 })
    if (!accepted.length) return

    setProgress({ done: 0, total: accepted.length })
    const uploaded: MediaItem[] = []
    const failed: string[] = []
    for (const file of accepted) {
      try {
        const res = await uploadFile(file, 'media', alt.trim())
        uploaded.push({ id: res.data.id, key: res.data.key, url: res.data.url, filename: file.name, alt: alt.trim(), size: file.size })
      } catch (e) {
        failed.push(`${file.name}: ${(e as Error).message}`)
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
    }
    setProgress(null)
    setAlt('')
    await load()
    if (failed.length) toast.error(uploaded.length ? 'Sebagian gagal diunggah' : 'Gagal mengunggah', { description: failed.join(' '), duration: 8000 })
    if (uploaded.length === 1 && !failed.length) {
      onSelect(uploaded[0]!)
      toast.success('Gambar terunggah dan dipakai')
    } else if (uploaded.length) {
      toast.success(`${uploaded.length} gambar terunggah`, { description: 'Pilih salah satu dari pustaka di bawah.' })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pilih gambar" description={`Dari pustaka media, atau unggah yang baru. Bisa beberapa sekaligus, masing-masing maksimal ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`} size="xl">
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama berkas atau keterangan…" className={`${inputCls} pl-9`} />
          </label>
          {can('media:upload') ? (
            <div className="flex gap-2 sm:w-[52%]">
              <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Keterangan gambar (opsional, bisa diisi nanti)" className={inputCls} aria-label="Keterangan gambar untuk unggahan baru" />
              <label className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-input)] bg-ink-900 px-3.5 text-sm font-semibold text-white hover:bg-ink-800 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload className="size-4" aria-hidden="true" />
                {busy ? `Mengunggah ${progress.done + 1}/${progress.total}…` : 'Unggah'}
                <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} aria-label="Pilih berkas gambar" onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void onPick(files) }} />
              </label>
            </div>
          ) : null}
        </div>

        {items === null ? (
          <Spinner label="Memuat pustaka…" />
        ) : filtered.length ? (
          <ul className="scroll-thin grid max-h-[56vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((m) => {
              const selected = value != null && (m.key === value || m.url === value)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className={`group/m relative block w-full overflow-hidden rounded-[var(--radius-tile)] border bg-white text-left transition-colors ${selected ? 'border-green-600 ring-2 ring-green-600/25' : 'border-line hover:border-ink-900'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaThumb(m.url, 192)} alt={m.alt ?? ''} className="aspect-[4/3] w-full bg-paper object-cover" loading="lazy" />
                    <span className="block p-2.5">
                      <span className="block truncate text-[12px] font-semibold text-ink-800">{m.filename}</span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-ink-400">{m.alt || 'tanpa keterangan'}</span>
                        {!m.alt ? <Pill tone="amber">alt</Pill> : null}
                      </span>
                    </span>
                    {selected ? <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-green-600 text-white"><Check className="size-3.5" /></span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty icon={<ImageOff className="size-5" />} title={q ? 'Tidak ada yang cocok' : 'Pustaka masih kosong'} body={q ? 'Coba kata lain.' : 'Unggah gambar pertama lewat kolom di atas.'} />
        )}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  )
}
