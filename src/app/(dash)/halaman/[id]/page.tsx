'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Eye, ExternalLink, Save, Rocket, Plus, EyeOff, Trash2, Search as SearchIcon,
  LayoutTemplate, Type, Package, Megaphone, Image as ImageIcon, ChevronDown, ChevronRight, Globe, MessageCircle,
} from 'lucide-react'
import { BLOCK_LIST, getBlock, defaultPropsFor, type SeoCheck } from '@/contracts'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { BlockForm } from '@/components/BlockForm'
import { BlockList } from '@/components/BlockList'
import { PreviewPanel } from '@/components/PreviewPanel'
import { Button, Card, Field, inputCls, Alert, Spinner, Pill, Modal, Kbd, Segmented, Switch } from '@/components/ui'

interface Block { id?: string; type: string; props: Record<string, unknown>; isVisible: boolean }
interface Page {
  id: string; title: string; slug: string; status: string; isSystem: boolean
  seo: Record<string, string | boolean | undefined>; blocks: Block[]
}

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3005'
const CATEGORY_ICON = { Utama: LayoutTemplate, Konten: Type, Produk: Package, Konversi: Megaphone, Media: ImageIcon } as const

/** Character counter coloured by the range that matters, not a bare "37/60". */
function Counter({ value, ideal, max }: { value: number; ideal: [number, number]; max: number }) {
  const tone = value === 0 ? 'text-ink-400' : value > max ? 'text-red-600' : value < ideal[0] || value > ideal[1] ? 'text-gold-600' : 'text-green-700'
  const note = value === 0 ? 'belum diisi' : value > max ? 'terlalu panjang, akan terpotong' : value < ideal[0] ? `kurang ${ideal[0] - value} karakter` : value > ideal[1] ? 'sedikit panjang' : 'panjang pas'
  return <span className={`tnum text-[11.5px] ${tone}`}>{note} · {value}/{ideal[1]}</span>
}

/** A ring gauge for the SEO score: read at a glance from across the desk. */
function ScoreRing({ score }: { score: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const tone = score >= 85 ? 'text-green-600' : score >= 60 ? 'text-gold-500' : 'text-red-600'
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-ink-100" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className={`${tone} transition-[stroke-dashoffset] duration-700 [transition-timing-function:var(--ease-settle)]`} />
      </svg>
      <span className="figure tnum text-[15px] text-ink-900">{score}</span>
    </span>
  )
}

export default function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { can } = useAuth()

  const [page, setPage] = useState<Page | null>(null)
  const [seo, setSeo] = useState<{ checks: SeoCheck[]; score: number } | null>(null)
  const [active, setActive] = useState(0)
  const [picker, setPicker] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [preview, setPreview] = useState(false)
  const [seoTab, setSeoTab] = useState<'google' | 'sosial'>('google')
  const [infoOpen, setInfoOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    void api
      .get<{ data: Page; seo: { checks: SeoCheck[]; score: number } }>(`/pages/${id}`)
      .then((r) => { setPage(r.data); setSeo(r.seo) })
      .catch((e) => setLoadError((e as Error).message))
      .finally(() => setLoading(false))
  }, [id])

  // Re-score as they type, debounced. This panel is what keeps the audit's
  // "judul terlalu pendek / deskripsi kosong" findings from coming back.
  const analyse = useCallback(async (p: Page) => {
    try {
      const r = await api.post<{ checks: SeoCheck[]; score: number }>('/pages/analyse', { title: p.title, slug: p.slug, seo: p.seo, blocks: p.blocks })
      setSeo(r)
    } catch { /* scoring is advisory; never block editing on it */ }
  }, [])

  useEffect(() => {
    if (!page) return
    const t = setTimeout(() => void analyse(page), 600)
    return () => clearTimeout(t)
  }, [page, analyse])

  // ⌘S saves a draft; the browser's own "save page" dialog is never what an editor wants here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const blocks = page?.blocks ?? []
  const current = blocks[active]
  const currentDef = current ? getBlock(current.type) : undefined

  const usedSingletons = useMemo(() => new Set(blocks.filter((b) => getBlock(b.type)?.singleton).map((b) => b.type)), [blocks])

  const patch = (next: Partial<Page>) => { setPage((p) => (p ? { ...p, ...next } : p)); setDirty(true) }
  const setBlocks = (next: Block[]) => patch({ blocks: next })

  function addBlock(type: string) {
    const def = getBlock(type)
    if (!def) return
    setBlocks([...blocks, { type, props: defaultPropsFor(type), isVisible: true }])
    setActive(blocks.length)
    setPicker(false)
    toast.success(`Blok “${def.label}” ditambahkan`, { description: 'Isi kontennya di panel tengah, lalu simpan.' })
  }

  function reorder(from: number, to: number) {
    const copy = [...blocks]
    const [moved] = copy.splice(from, 1)
    if (!moved) return
    copy.splice(to, 0, moved)
    setBlocks(copy)
    setActive(to)
  }

  function duplicate(i: number) {
    const source = blocks[i]
    if (!source) return
    const copy = [...blocks]
    copy.splice(i + 1, 0, { type: source.type, props: structuredClone(source.props), isVisible: source.isVisible })
    setBlocks(copy)
    setActive(i + 1)
  }

  function removeAt(i: number) {
    const def = getBlock(blocks[i]?.type ?? '')
    setBlocks(blocks.filter((_, j) => j !== i))
    setActive((a) => Math.max(0, Math.min(a, blocks.length - 2)))
    toast(`Blok “${def?.label ?? 'blok'}” dihapus`, { description: 'Belum tersimpan. Simpan draf untuk menerapkan.' })
  }

  async function save(publish = false) {
    if (!page || saving) return
    setSaving(true)
    try {
      await api.patch(`/pages/${page.id}`, { title: page.title, slug: page.slug, seo: page.seo, blocks: page.blocks })
      if (publish) {
        await api.post(`/pages/${page.id}/publish`)
        setPage((p) => (p ? { ...p, status: 'published' } : p))
        toast.success('Halaman diterbitkan', { description: 'Perubahan sudah tampil di website.' })
      } else {
        toast.success('Draf tersimpan')
      }
      setDirty(false)
    } catch (err) {
      const e = err as ApiError
      const detail = Array.isArray(e.details) ? e.details.map((d) => d.message).join(' ') : undefined
      toast.error(publish ? 'Belum bisa diterbitkan' : 'Gagal menyimpan', { description: detail ?? e.message, duration: 8000 })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (loadError || !page) return <Alert>{loadError ?? 'Halaman tidak ditemukan.'}</Alert>

  const score = seo?.score ?? 0
  const failing = (seo?.checks ?? []).filter((c) => c.status === 'fail').length
  const publicUrl = `${LP}/${page.slug === '/' ? '' : page.slug}`
  const pickerItems = BLOCK_LIST.filter((b) => !pickerQuery || `${b.label} ${b.description} ${b.category}`.toLowerCase().includes(pickerQuery.toLowerCase()))

  return (
    <>
      {/* ── toolbar ── */}
      <div className="sticky top-14 z-10 -mx-4 mb-5 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/halaman')}><ArrowLeft className="size-4" /> Halaman</Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[17px] font-extrabold tracking-[-0.01em] text-ink-900">{page.title || 'Halaman tanpa judul'}</h1>
              <Pill tone={page.status === 'published' ? 'green' : 'amber'} dot>{page.status === 'published' ? 'Terbit' : 'Draf'}</Pill>
              {dirty ? <Pill tone="gold">Belum disimpan</Pill> : null}
            </div>
            <p className="mono mt-0.5 truncate text-[11.5px] text-ink-400">{publicUrl.replace(/^https?:\/\//, '')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreview(true)}><Eye className="size-4" /> Pratinjau</Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(publicUrl, '_blank', 'noopener')}><ExternalLink className="size-4" /> <span className="hidden sm:inline">Lihat di website</span></Button>
            <Button variant="secondary" size="sm" onClick={() => void save(false)} loading={saving} title="Ctrl/⌘ + S"><Save className="size-4" /> Simpan draf</Button>
            {can('pages:publish') ? (
              <Button variant="dark" size="sm" onClick={() => void save(true)} disabled={saving} title={failing ? `${failing} poin SEO harus dibereskan dulu` : undefined}>
                <Rocket className="size-4" /> Terbitkan
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[264px_minmax(0,1fr)_312px]">
        {/* ── rail: block list ── */}
        <Card className="h-fit min-w-0 p-3 xl:sticky xl:top-[7.25rem]">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="t-label">Susunan blok <span className="tnum text-ink-300">· {blocks.length}</span></span>
            <Button size="xs" variant="dark" onClick={() => setPicker(true)}><Plus className="size-3.5" /> Blok</Button>
          </div>
          {blocks.length ? (
            <>
              <BlockList
                blocks={blocks}
                active={active}
                onSelect={setActive}
                onReorder={reorder}
                onDuplicate={duplicate}
                onRemove={removeAt}
                onToggleVisible={(i) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, isVisible: !b.isVisible } : b)))}
              />
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 px-1 text-[11px] leading-relaxed text-ink-400">
                Tarik untuk mengubah urutan, atau <Kbd>Ctrl</Kbd><Kbd>↑</Kbd><Kbd>↓</Kbd> saat blok dipilih.
              </p>
            </>
          ) : (
            <button type="button" onClick={() => setPicker(true)} className="w-full rounded-[var(--radius-tile)] border border-dashed border-line-strong bg-paper px-3 py-8 text-center text-[13px] text-ink-500 hover:border-ink-900 hover:text-ink-900">
              Belum ada blok. Tambah blok pertama.
            </button>
          )}
        </Card>

        {/* ── canvas ── */}
        <div className="grid min-w-0 gap-5">
          <Card className="overflow-hidden">
            <button type="button" onClick={() => setInfoOpen((o) => !o)} aria-expanded={infoOpen} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-paper">
              {infoOpen ? <ChevronDown className="size-4 text-ink-400" /> : <ChevronRight className="size-4 text-ink-400" />}
              <span className="flex-1">
                <span className="block text-[15px] font-bold text-ink-900">Informasi halaman & SEO</span>
                <span className="block text-[12.5px] text-ink-500">Judul, alamat, dan apa yang muncul di Google dan WhatsApp.</span>
              </span>
              {!page.seo.metaDescription || !page.seo.metaTitle ? <Pill tone="amber">Perlu dilengkapi</Pill> : <Pill tone="green">Lengkap</Pill>}
            </button>
            {infoOpen ? (
              <div className="border-t border-line p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Judul halaman" required>
                    <input value={page.title} onChange={(e) => patch({ title: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Alamat halaman (slug)" hint={page.isSystem ? 'Halaman sistem: alamat tidak bisa diubah.' : 'Huruf kecil dan tanda hubung saja.'}>
                    <input value={page.slug} disabled={page.isSystem} onChange={(e) => patch({ slug: e.target.value })} className={`${inputCls} mono`} />
                  </Field>
                </div>
                <div className="mt-4 grid gap-4">
                  <Field label="Kata kunci utama" hint="Satu frasa yang paling ingin dicari orang untuk menemukan halaman ini, misalnya “pinjaman koperasi karangasem”. Dipakai untuk memeriksa penempatan, tidak ditampilkan di website.">
                    <input value={String(page.seo.focusKeyword ?? '')} onChange={(e) => patch({ seo: { ...page.seo, focusKeyword: e.target.value } })} placeholder="pinjaman koperasi karangasem" className={inputCls} />
                  </Field>
                  <Field label="Judul untuk Google" hint="Ini yang muncul sebagai judul di hasil pencarian." required counter={<Counter value={String(page.seo.metaTitle ?? '').length} ideal={[50, 60]} max={70} />}>
                    <input value={String(page.seo.metaTitle ?? '')} onChange={(e) => patch({ seo: { ...page.seo, metaTitle: e.target.value } })} className={inputCls} />
                  </Field>
                  <Field label="Deskripsi untuk Google" hint="Kalimat di bawah judul pada hasil pencarian." required counter={<Counter value={String(page.seo.metaDescription ?? '').length} ideal={[120, 158]} max={180} />}>
                    <textarea rows={3} value={String(page.seo.metaDescription ?? '')} onChange={(e) => patch({ seo: { ...page.seo, metaDescription: e.target.value } })} className={inputCls} />
                  </Field>
                  <details className="rounded-[var(--radius-input)] border border-line bg-paper/60 p-3.5">
                    <summary className="cursor-pointer text-[13px] font-semibold text-ink-800">Pengaturan lanjutan</summary>
                    <div className="mt-4 grid gap-4">
                      <Field label="Gambar untuk WhatsApp & media sosial" hint="Tampil saat tautan halaman dibagikan. Ukuran ideal 1200×630 piksel.">
                        <input value={String(page.seo.ogImage ?? '')} onChange={(e) => patch({ seo: { ...page.seo, ogImage: e.target.value } })} placeholder="https://…" className={`${inputCls} mono`} />
                      </Field>
                      <Field label="Alamat kanonik" hint="Kosongkan kecuali isi halaman ini sama dengan halaman lain. Diisi salah justru menghilangkan halaman ini dari Google.">
                        <input value={String(page.seo.canonicalUrl ?? '')} onChange={(e) => patch({ seo: { ...page.seo, canonicalUrl: e.target.value } })} placeholder="https://…" className={`${inputCls} mono`} />
                      </Field>
                      <Switch checked={Boolean(page.seo.noindex)} onChange={(v) => patch({ seo: { ...page.seo, noindex: v } })} label="Sembunyikan dari Google (noindex)" hint="Halaman tetap bisa dibuka lewat tautan langsung, tapi tidak muncul di hasil pencarian. Biarkan mati untuk halaman biasa." />
                    </div>
                  </details>
                </div>
              </div>
            ) : null}
          </Card>

          {current && currentDef ? (
            <Card>
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <p className="mono text-[11px] text-ink-400">blok {String(active + 1).padStart(2, '0')} · {currentDef.category.toLowerCase()}</p>
                  <h2 className="mt-0.5 text-[16px] font-bold text-ink-900">{currentDef.label}</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">{currentDef.description}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setBlocks(blocks.map((b, i) => (i === active ? { ...b, isVisible: !b.isVisible } : b)))}>
                    {current.isVisible ? <><EyeOff className="size-3.5" /> Sembunyikan</> : <><Eye className="size-3.5" /> Tampilkan</>}
                  </Button>
                  <Button size="sm" variant="dangerGhost" onClick={() => removeAt(active)}><Trash2 className="size-3.5" /> Hapus</Button>
                </div>
              </div>
              <div className="p-5">
                {!current.isVisible ? <div className="mb-4"><Alert tone="amber">Blok ini disembunyikan dan tidak tampil di website.</Alert></div> : null}
                <BlockForm
                  fields={currentDef.fields}
                  value={current.props}
                  onChange={(props) => setBlocks(blocks.map((b, i) => (i === active ? { ...b, props } : b)))}
                />
              </div>
            </Card>
          ) : (
            <Card className="p-10 text-center text-[13.5px] text-ink-500">Pilih blok di kiri untuk mengubah isinya, atau tambah blok baru.</Card>
          )}
        </div>

        {/* ── SEO panel ── */}
        <Card className="h-fit min-w-0 p-5 xl:sticky xl:top-[7.25rem]">
          <div className="flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink-900">Kesiapan SEO</h2>
              <p className="text-[12.5px] text-ink-500">{failing ? `${failing} poin merah menahan penerbitan.` : score >= 85 ? 'Siap terbit.' : 'Ada yang bisa dirapikan.'}</p>
            </div>
          </div>

          <div className="mt-5">
            <Segmented
              size="sm"
              ariaLabel="Pratinjau tampilan"
              value={seoTab}
              onChange={setSeoTab}
              options={[
                { value: 'google', label: <span className="inline-flex items-center gap-1.5"><Globe className="size-3.5" /> Google</span> },
                { value: 'sosial', label: <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" /> WhatsApp</span> },
              ]}
            />
          </div>

          {seoTab === 'google' ? (
            <div className="mt-3 rounded-[var(--radius-tile)] border border-line bg-white p-3.5">
              <p className="mono truncate text-[11px] text-ink-500">{publicUrl.replace(/^https?:\/\//, '')}</p>
              <p className="mt-1 truncate text-[15px] text-[#1a0dab]">{String(page.seo.metaTitle || page.title || 'Judul halaman')}</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-600">
                {String(page.seo.metaDescription || 'Deskripsi belum diisi. Google akan memilih kalimat acak dari halaman.')}
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-[var(--radius-tile)] border border-line">
              {page.seo.ogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(page.seo.ogImage)} alt="" className="aspect-[1200/630] w-full bg-ink-100 object-cover" />
              ) : (
                <div className="grid aspect-[1200/630] w-full place-items-center bg-paper px-4 text-center text-[11px] leading-relaxed text-ink-400">
                  Belum ada gambar. WhatsApp akan menampilkan kartu polos.
                </div>
              )}
              <div className="bg-white p-3">
                <p className="mono text-[10px] text-ink-400">{LP.replace(/^https?:\/\//, '')}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink-900">{String(page.seo.metaTitle || page.title || 'Judul halaman')}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">{String(page.seo.metaDescription || 'Deskripsi belum diisi.')}</p>
              </div>
            </div>
          )}

          <ul className="mt-5 grid gap-2.5">
            {(seo?.checks ?? []).map((check) => (
              <li key={check.id} className="flex gap-2.5">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${check.status === 'pass' ? 'bg-green-500' : check.status === 'warn' ? 'bg-gold-400' : 'bg-red-600'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink-800">{check.label}</span>
                  <span className="block text-[12px] leading-relaxed text-ink-500">{check.hint}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-400">Poin merah harus diperbaiki sebelum halaman bisa diterbitkan.</p>
        </Card>
      </div>

      {preview ? (
        <PreviewPanel pageId={page.id} draft={{ title: page.title, slug: page.slug, seo: page.seo, blocks: page.blocks }} onClose={() => setPreview(false)} />
      ) : null}

      <Modal open={picker} onClose={() => setPicker(false)} title="Tambah blok" description="Pilih bagian yang ingin ditambahkan ke halaman. Blok masuk di urutan paling bawah dan bisa dipindah." size="xl">
        <label className="relative mb-4 block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input autoFocus value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Cari blok…" className={`${inputCls} pl-9`} />
        </label>
        <div className="scroll-thin grid max-h-[60vh] gap-6 overflow-y-auto pr-1">
          {(['Utama', 'Konten', 'Produk', 'Konversi', 'Media'] as const).map((category) => {
            const items = pickerItems.filter((b) => b.category === category)
            if (!items.length) return null
            const CatIcon = CATEGORY_ICON[category]
            return (
              <div key={category}>
                <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink-500"><CatIcon className="size-3.5" /> {category}</h3>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((block) => {
                    const blocked = block.singleton && usedSingletons.has(block.type)
                    return (
                      <li key={block.type}>
                        <button
                          onClick={() => addBlock(block.type)}
                          disabled={blocked}
                          className="group/pick h-full w-full rounded-[var(--radius-tile)] border border-line bg-white p-3.5 text-left transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="block text-[13.5px] font-bold text-ink-900">{block.label}</span>
                            <Plus className="size-4 text-ink-300 transition-colors group-hover/pick:text-ink-900" />
                          </span>
                          <span className="mt-1 block text-[12px] leading-relaxed text-ink-500">
                            {blocked ? 'Sudah dipakai. Hanya boleh satu per halaman.' : block.description}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {!pickerItems.length ? <p className="py-8 text-center text-[13px] text-ink-400">Tidak ada blok yang cocok.</p> : null}
        </div>
      </Modal>
    </>
  )
}
