'use client'

import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { Plus, Search as SearchIcon, LayoutTemplate, Type, Package, Megaphone, Image as ImageIcon, Monitor, Smartphone, MousePointerClick } from 'lucide-react'
import { BLOCK_LIST, type BlockDef } from '@/contracts'
import { api } from '@/lib/api'
import { LP_URL as LP, pointsAtSelf } from '@/lib/site'
import { Modal, Button, inputCls, Spinner, Alert } from './ui'
import { BlockSketch } from './block-sketches'
import { sampleProps } from './block-sample'

const CATEGORIES = ['Utama', 'Konten', 'Produk', 'Konversi', 'Media'] as const
const CATEGORY_ICON = { Utama: LayoutTemplate, Konten: Type, Produk: Package, Konversi: Megaphone, Media: ImageIcon } as const

/** The frame the website is rendered into, then scaled to fit the pane. */
const FRAMES = {
  desktop: { width: 1280, height: 900, icon: Monitor, label: 'Desktop' },
  mobile: { width: 390, height: 780, icon: Smartphone, label: 'Ponsel' },
} as const
type FrameKey = keyof typeof FRAMES
const PANE = 420

/**
 * The "Tambah blok" dialog.
 *
 * Every card carries a wireframe of its shape, and the pane on the right
 * renders the block the cursor is on with sample content through the
 * website's own preview route — the same components and data the page will
 * use — so an editor sees what a block is before it lands on the page.
 */
export function BlockPicker({
  open, onClose, onAdd, used, pageId, slug,
}: {
  open: boolean
  onClose: () => void
  onAdd: (type: string) => void
  /** Singleton types already on the page. */
  used: Set<string>
  pageId: string
  slug: string
}) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<BlockDef | null>(null)
  const [frame, setFrame] = useState<FrameKey>('desktop')
  const [image, setImage] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tokens = useRef(new Map<string, string>())
  const selfFramed = typeof window !== 'undefined' && pointsAtSelf(window.location.origin)

  useEffect(() => {
    if (open) return
    setQuery(''); setFocus(null); setToken(null); setError(null); tokens.current.clear()
  }, [open])

  // A picture from the media library stands in for every image field, so the
  // sample looks like the koperasi's page rather than a grey placeholder.
  useEffect(() => {
    if (!open) return
    void api.get<{ data: { key: string }[] }>('/media?limit=1').then((r) => { setImage(r.data[0]?.key ?? ''); tokens.current.clear() }).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open || !focus || selfFramed) return
    const cached = tokens.current.get(focus.type)
    if (cached) { setToken(cached); setError(null); return }
    let cancelled = false
    // Debounced: the cursor sweeps over several cards on its way to one.
    const timer = setTimeout(async () => {
      setLoading(true); setError(null)
      try {
        const r = await api.post<{ data: { token: string } }>(`/pages/${pageId}/preview`, {
          title: 'Pratinjau blok', slug, seo: {},
          blocks: [{ type: focus.type, props: sampleProps(focus.type, image), isVisible: true }],
        })
        if (cancelled) return
        tokens.current.set(focus.type, r.data.token)
        setToken(r.data.token)
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); toast.error('Pratinjau blok gagal dimuat', { description: (e as Error).message }) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, focus, pageId, slug, image, selfFramed])

  const items = BLOCK_LIST.filter((b) => !query || `${b.label} ${b.description} ${b.category}`.toLowerCase().includes(query.toLowerCase()))
  const blocked = (b: BlockDef) => Boolean(b.singleton && used.has(b.type))
  const f = FRAMES[frame]
  const scale = Math.min(1, PANE / f.width)
  const visible = Math.round(f.height * scale)

  return (
    <Modal open={open} onClose={onClose} title="Tambah blok" description="Arahkan kursor ke sebuah blok untuk melihat tampilannya di website, lalu tambahkan. Blok masuk di urutan paling bawah dan bisa dipindah." size="2xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0">
          <label className="relative mb-4 block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari blok…" className={`${inputCls} pl-9`} aria-label="Cari blok" />
          </label>
          <div className="scroll-thin grid max-h-[68vh] gap-6 overflow-y-auto pr-1">
            {CATEGORIES.map((category) => {
              const list = items.filter((b) => b.category === category)
              if (!list.length) return null
              const CatIcon = CATEGORY_ICON[category]
              return (
                <div key={category}>
                  <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink-500"><CatIcon className="size-3.5" /> {category}</h3>
                  <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((block) => {
                      const off = blocked(block)
                      const active = focus?.type === block.type
                      return (
                        <li key={block.type}>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            onMouseEnter={() => setFocus(block)}
                            onFocus={() => setFocus(block)}
                            onClick={() => setFocus(block)}
                            onDoubleClick={() => { if (!off) onAdd(block.type) }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !off) { e.preventDefault(); onAdd(block.type) } }}
                            className={`group/pick grid h-full cursor-pointer gap-2.5 rounded-[var(--radius-tile)] border bg-white p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-green-600 ${active ? 'border-ink-900 shadow-[var(--shadow-lift)]' : 'border-line hover:border-ink-400'} ${off ? 'opacity-60' : ''}`}
                          >
                            <BlockSketch type={block.type} />
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block text-[13.5px] font-bold text-ink-900">{block.label}</span>
                                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{off ? 'Sudah dipakai. Hanya boleh satu per halaman.' : block.description}</span>
                              </span>
                              <button
                                type="button"
                                disabled={off}
                                onClick={(e) => { e.stopPropagation(); onAdd(block.type) }}
                                aria-label={`Tambah ${block.label}`}
                                title="Tambah ke halaman"
                                className="grid size-8 shrink-0 place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-ink-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-400"
                              >
                                <Plus className="size-4" />
                              </button>
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
            {!items.length ? <p className="py-8 text-center text-[13px] text-ink-400">Tidak ada blok yang cocok.</p> : null}
          </div>
        </div>

        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-0 grid gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4">
            {focus ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{focus.category}</p>
                    <h3 className="text-[15px] font-bold text-ink-900">{focus.label}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{focus.description}</p>
                  </div>
                  <span className="flex shrink-0 rounded-[var(--radius-tile)] border border-line bg-white p-0.5" role="group" aria-label="Lebar pratinjau">
                    {(Object.keys(FRAMES) as FrameKey[]).map((k) => { const I = FRAMES[k].icon; return (
                      <button key={k} type="button" onClick={() => setFrame(k)} aria-pressed={frame === k} aria-label={FRAMES[k].label} title={FRAMES[k].label}
                        className={`grid size-7 place-items-center rounded-[5px] transition-colors ${frame === k ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`}>
                        <I className="size-3.5" />
                      </button>
                    ) })}
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-[var(--radius-tile)] border border-line bg-white" style={{ height: visible }}>
                  {selfFramed ? (
                    <div className="p-4"><Alert>Alamat website di pengaturan menunjuk ke konsol ini sendiri, jadi pratinjau tidak bisa ditampilkan.</Alert></div>
                  ) : token ? (
                    <iframe
                      key={`${token}-${frame}`}
                      src={`${LP}/pratinjau/${token}`}
                      title={`Pratinjau ${focus.label}`}
                      style={{ width: f.width, height: f.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                      className="border-0"
                    />
                  ) : null}
                  {loading || (!token && !error && !selfFramed) ? (
                    <div className="absolute inset-0 grid place-items-center bg-white/70"><Spinner /></div>
                  ) : null}
                </div>

                <p className="text-[11.5px] leading-relaxed text-ink-400">
                  Isi contoh. Daftar yang diambil dari koleksi (produk, berita, kantor, pencapaian) memakai data sebenarnya.
                </p>
                <Button variant="dark" className="w-full" onClick={() => onAdd(focus.type)} disabled={blocked(focus)}>
                  <Plus className="size-4" /> {blocked(focus) ? 'Sudah ada di halaman' : `Tambah “${focus.label}”`}
                </Button>
              </>
            ) : (
              <div className="grid place-items-center gap-3 py-16 text-center">
                <MousePointerClick className="size-6 text-ink-300" aria-hidden="true" />
                <p className="max-w-[24ch] text-[13px] leading-relaxed text-ink-500">Arahkan kursor ke sebuah blok untuk melihat bentuknya di website.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  )
}
