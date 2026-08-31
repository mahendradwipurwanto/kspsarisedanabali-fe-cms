'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BLOCK_LIST, getBlock, defaultPropsFor, type SeoCheck } from '@/contracts'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { BlockForm } from '@/components/BlockForm'
import { BlockList } from '@/components/BlockList'
import { PreviewPanel } from '@/components/PreviewPanel'
import { Button, Card, Field, inputCls, Alert, Spinner, Pill, Modal, PageHeader } from '@/components/ui'

interface Block { id?: string; type: string; props: Record<string, unknown>; isVisible: boolean }
interface Page {
  id: string; title: string; slug: string; status: string; isSystem: boolean
  seo: Record<string, string | boolean | undefined>; blocks: Block[]
}

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3005'

/**
 * Character counter that colours by the range that actually matters. A bare
 * "37/60" tells an editor nothing about whether 37 is a problem.
 */
function Counter({ value, ideal, max }: { value: number; ideal: [number, number]; max: number }) {
  const tone =
    value === 0 ? 'text-ink-400'
      : value > max ? 'text-[#c4443a]'
        : value < ideal[0] || value > ideal[1] ? 'text-[#a9781a]'
          : 'text-brand-700'
  const note =
    value === 0 ? 'belum diisi'
      : value > max ? 'terlalu panjang, akan terpotong'
        : value < ideal[0] ? `kurang ${ideal[0] - value} karakter`
          : value > ideal[1] ? 'sedikit panjang'
            : 'panjang pas'
  return (
    <span className={`mt-1 flex items-center justify-between text-xs tabular-nums ${tone}`}>
      <span>{note}</span>
      <span>{value}/{ideal[1]}</span>
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
  const [preview, setPreview] = useState(false)
  const [seoTab, setSeoTab] = useState<'google' | 'sosial'>('google')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'green' | 'red' | 'amber'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api
      .get<{ data: Page; seo: { checks: SeoCheck[]; score: number } }>(`/pages/${id}`)
      .then((r) => { setPage(r.data); setSeo(r.seo) })
      .catch((e) => setMessage({ tone: 'red', text: (e as Error).message }))
      .finally(() => setLoading(false))
  }, [id])

  // Re-score as they type, debounced — this is the panel that stops the audit's
  // "judul terlalu pendek / deskripsi kosong" findings from coming back.
  const analyse = useCallback(async (p: Page) => {
    try {
      const r = await api.post<{ checks: SeoCheck[]; score: number }>('/pages/analyse', {
        title: p.title, slug: p.slug, seo: p.seo, blocks: p.blocks,
      })
      setSeo(r)
    } catch { /* scoring is advisory; never block editing on it */ }
  }, [])

  useEffect(() => {
    if (!page) return
    const t = setTimeout(() => void analyse(page), 600)
    return () => clearTimeout(t)
  }, [page, analyse])

  const blocks = page?.blocks ?? []
  const current = blocks[active]
  const currentDef = current ? getBlock(current.type) : undefined

  const usedSingletons = useMemo(
    () => new Set(blocks.filter((b) => getBlock(b.type)?.singleton).map((b) => b.type)),
    [blocks],
  )

  const patch = (next: Partial<Page>) => setPage((p) => (p ? { ...p, ...next } : p))
  const setBlocks = (next: Block[]) => patch({ blocks: next })

  function addBlock(type: string) {
    const def = getBlock(type)
    if (!def) return
    setBlocks([...blocks, { type, props: defaultPropsFor(type), isVisible: true }])
    setActive(blocks.length)
    setPicker(false)
  }

  /** Move a block to an arbitrary index — a drag can span several positions,
   *  so swapping neighbours is not enough. */
  function reorder(from: number, to: number) {
    const copy = [...blocks]
    const [moved] = copy.splice(from, 1)
    if (!moved) return
    copy.splice(to, 0, moved)
    setBlocks(copy)
    // Follow the block the editor just moved rather than the position.
    setActive(to)
  }

  function duplicate(i: number) {
    const source = blocks[i]
    if (!source) return
    const copy = [...blocks]
    // Drop the id so the API inserts a new row instead of updating the original.
    copy.splice(i + 1, 0, { type: source.type, props: structuredClone(source.props), isVisible: source.isVisible })
    setBlocks(copy)
    setActive(i + 1)
  }

  function removeAt(i: number) {
    setBlocks(blocks.filter((_, j) => j !== i))
    setActive((a) => Math.max(0, Math.min(a, blocks.length - 2)))
  }

  async function save(publish = false) {
    if (!page) return
    setSaving(true)
    setMessage(null)
    try {
      await api.patch(`/pages/${page.id}`, { title: page.title, slug: page.slug, seo: page.seo, blocks: page.blocks })
      if (publish) {
        await api.post(`/pages/${page.id}/publish`)
        patch({ status: 'published' })
        setMessage({ tone: 'green', text: 'Halaman berhasil diterbitkan dan sudah tampil di website.' })
      } else {
        setMessage({ tone: 'green', text: 'Perubahan tersimpan sebagai draf.' })
      }
    } catch (err) {
      const e = err as ApiError
      // The API runs the same publish gate the panel shows, so a direct API call
      // cannot bypass it. Surface exactly which checks failed.
      const detail = Array.isArray(e.details) ? ` ${e.details.map((d) => d.message).join(' ')}` : ''
      setMessage({ tone: 'red', text: `${e.message}${detail}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (!page) return <Alert>Halaman tidak ditemukan.</Alert>

  const scoreTone = (seo?.score ?? 0) >= 85 ? 'green' : (seo?.score ?? 0) >= 60 ? 'amber' : 'red'

  return (
    <>
      <PageHeader
        title={page.title || 'Halaman tanpa judul'}
        subtitle={`/${page.slug === '/' ? '' : page.slug}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push('/halaman')}>Kembali</Button>
            <Button variant="secondary" onClick={() => setPreview(true)}>Pratinjau</Button>
            <Button variant="secondary" onClick={() => window.open(`${LP}/${page.slug === '/' ? '' : page.slug}`, '_blank')}>
              Lihat di website
            </Button>
            <Button variant="secondary" onClick={() => void save(false)} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan Draf'}
            </Button>
            {can('pages:publish') ? (
              <Button onClick={() => void save(true)} disabled={saving}>Terbitkan</Button>
            ) : null}
          </div>
        }
      />

      {message ? <div className="mb-5"><Alert tone={message.tone}>{message.text}</Alert></div> : null}

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* ─── block list ─── */}
        <Card className="h-fit p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Susunan Blok</span>
            <Button size="sm" variant="secondary" onClick={() => setPicker(true)}>+ Blok</Button>
          </div>
          <BlockList
            blocks={blocks}
            active={active}
            onSelect={setActive}
            onReorder={reorder}
            onDuplicate={duplicate}
            onRemove={removeAt}
            onToggleVisible={(i) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, isVisible: !b.isVisible } : b)))}
          />
          {!blocks.length ? (
            <p className="px-2 py-6 text-center text-sm text-ink-500">Belum ada blok.</p>
          ) : (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-400">
              Tarik ⠿ untuk mengubah urutan, atau tekan Ctrl + ↑ / ↓ saat blok dipilih.
            </p>
          )}
        </Card>

        {/* ─── editor ─── */}
        <div className="grid gap-5">
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-ink-900">Informasi Halaman</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Judul halaman" required>
                <input value={page.title} onChange={(e) => patch({ title: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Alamat halaman (slug)" hint={page.isSystem ? 'Halaman sistem — alamat tidak bisa diubah.' : 'Huruf kecil dan tanda hubung saja.'}>
                <input value={page.slug} disabled={page.isSystem} onChange={(e) => patch({ slug: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field
                label="Kata kunci utama"
                hint="Satu frasa yang paling ingin dicari orang untuk menemukan halaman ini — misalnya “pinjaman koperasi karangasem”. Dipakai untuk memeriksa penempatan, tidak ditampilkan di website."
              >
                <input
                  value={String(page.seo.focusKeyword ?? '')}
                  onChange={(e) => patch({ seo: { ...page.seo, focusKeyword: e.target.value } })}
                  placeholder="pinjaman koperasi karangasem"
                  className={inputCls}
                />
              </Field>

              <Field label="Judul untuk Google (title tag)" hint="Idealnya 50–60 karakter. Ini yang muncul sebagai judul di hasil pencarian." required>
                <input value={String(page.seo.metaTitle ?? '')} onChange={(e) => patch({ seo: { ...page.seo, metaTitle: e.target.value } })} className={inputCls} />
                <Counter value={(String(page.seo.metaTitle ?? '')).length} ideal={[50, 60]} max={70} />
              </Field>

              <Field label="Deskripsi untuk Google (meta description)" hint="Idealnya 120–158 karakter. Ini kalimat di bawah judul pada hasil pencarian." required>
                <textarea rows={3} value={String(page.seo.metaDescription ?? '')} onChange={(e) => patch({ seo: { ...page.seo, metaDescription: e.target.value } })} className={inputCls} />
                <Counter value={(String(page.seo.metaDescription ?? '')).length} ideal={[120, 158]} max={180} />
              </Field>

              <details className="rounded-lg border border-ink-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink-800">Pengaturan lanjutan</summary>
                <div className="mt-4 grid gap-4">
                  <Field
                    label="Gambar untuk WhatsApp & media sosial (og:image)"
                    hint="Tampil saat tautan halaman ini dibagikan. Ukuran ideal 1200×630 piksel."
                  >
                    <input
                      value={String(page.seo.ogImage ?? '')}
                      onChange={(e) => patch({ seo: { ...page.seo, ogImage: e.target.value } })}
                      placeholder="https://…"
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    label="Alamat kanonik (canonical URL)"
                    hint="Kosongkan saja kecuali isi halaman ini sama dengan halaman lain. Diisi salah justru menghilangkan halaman ini dari Google."
                  >
                    <input
                      value={String(page.seo.canonicalUrl ?? '')}
                      onChange={(e) => patch({ seo: { ...page.seo, canonicalUrl: e.target.value } })}
                      placeholder="https://…"
                      className={inputCls}
                    />
                  </Field>

                  <label className="flex items-start gap-3 rounded-lg bg-ink-50 p-3">
                    <input
                      type="checkbox"
                      checked={Boolean(page.seo.noindex)}
                      onChange={(e) => patch({ seo: { ...page.seo, noindex: e.target.checked } })}
                      className="mt-0.5 size-4"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink-800">Sembunyikan dari Google (noindex)</span>
                      <span className="block text-xs leading-relaxed text-ink-500">
                        Halaman tetap bisa dibuka lewat tautan langsung, tapi tidak akan muncul di hasil pencarian.
                        Biarkan mati untuk halaman biasa.
                      </span>
                    </span>
                  </label>
                </div>
              </details>
            </div>
          </Card>

          {current && currentDef ? (
            <Card className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink-900">{currentDef.label}</h2>
                  <p className="mt-0.5 text-sm text-ink-500">{currentDef.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => setBlocks(blocks.map((b, i) => (i === active ? { ...b, isVisible: !b.isVisible } : b)))}
                  >
                    {current.isVisible ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="text-[#c4443a] hover:bg-[#fdf1f0]"
                    onClick={() => {
                      setBlocks(blocks.filter((_, i) => i !== active))
                      setActive((a) => Math.max(0, a - 1))
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>

              {!current.isVisible ? (
                <div className="mb-4"><Alert tone="amber">Blok ini disembunyikan dan tidak tampil di website.</Alert></div>
              ) : null}

              <BlockForm
                fields={currentDef.fields}
                value={current.props}
                onChange={(props) => setBlocks(blocks.map((b, i) => (i === active ? { ...b, props } : b)))}
              />
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-ink-500">Pilih blok di kiri untuk mengubah isinya, atau tambah blok baru.</Card>
          )}
        </div>

        {/* ─── SEO panel ─── */}
        <Card className="h-fit p-5 xl:sticky xl:top-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Kesiapan SEO</h2>
            <Pill tone={scoreTone}>{seo?.score ?? 0}%</Pill>
          </div>

          <div className="mb-3 flex rounded-lg border border-ink-200 p-0.5" role="tablist" aria-label="Pratinjau tampilan">
            {([['google', 'Google'], ['sosial', 'WhatsApp']] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={seoTab === key}
                onClick={() => setSeoTab(key)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  seoTab === key ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {seoTab === 'google' ? (
            <div className="mb-5 rounded-lg border border-ink-200 bg-ink-50 p-3">
              <p className="mt-1.5 truncate text-[15px] text-[#1a0dab]">{String(page.seo.metaTitle || page.title || 'Judul halaman')}</p>
              <p className="truncate text-xs text-[#006621]">{LP.replace(/^https?:\/\//, '')}/{page.slug === '/' ? '' : page.slug}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600">
                {String(page.seo.metaDescription || 'Deskripsi belum diisi — Google akan memilih kalimat acak dari halaman.')}
              </p>
            </div>
          ) : (
            /* What a link to this page looks like pasted into a chat — the way
               most of this koperasi's traffic is actually shared. */
            <div className="mb-5 overflow-hidden rounded-lg border border-ink-200">
              {page.seo.ogImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={String(page.seo.ogImage)} alt="" className="aspect-[1200/630] w-full bg-ink-100 object-cover" />
              ) : (
                <div className="grid aspect-[1200/630] w-full place-items-center bg-ink-100 px-4 text-center text-[11px] leading-relaxed text-ink-400">
                  Belum ada gambar — WhatsApp akan menampilkan kartu polos tanpa gambar.
                </div>
              )}
              <div className="bg-ink-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-400">{LP.replace(/^https?:\/\//, '')}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink-900">
                  {String(page.seo.metaTitle || page.title || 'Judul halaman')}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
                  {String(page.seo.metaDescription || 'Deskripsi belum diisi.')}
                </p>
              </div>
            </div>
          )}

          <ul className="grid gap-2.5">
            {(seo?.checks ?? []).map((check) => (
              <li key={check.id} className="flex gap-2.5">
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    check.status === 'pass' ? 'bg-brand-500' : check.status === 'warn' ? 'bg-[#d9a521]' : 'bg-[#c4443a]'
                  }`}
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-800">{check.label}</span>
                  <span className="block text-xs leading-relaxed text-ink-500">{check.hint}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-ink-200 pt-4 text-xs leading-relaxed text-ink-500">
            Poin merah harus diperbaiki sebelum halaman bisa diterbitkan.
          </p>
        </Card>
      </div>

      {preview ? (
        <PreviewPanel
          pageId={page.id}
          draft={{ title: page.title, slug: page.slug, seo: page.seo, blocks: page.blocks }}
          onClose={() => setPreview(false)}
        />
      ) : null}

      <Modal open={picker} onClose={() => setPicker(false)} title="Tambah Blok" wide>
        <div className="grid gap-5">
          {['Utama', 'Konten', 'Produk', 'Konversi', 'Media'].map((category) => {
            const items = BLOCK_LIST.filter((b) => b.category === category)
            if (!items.length) return null
            return (
              <div key={category}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">{category}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((block) => {
                    const blocked = block.singleton && usedSingletons.has(block.type)
                    return (
                      <li key={block.type}>
                        <button
                          onClick={() => addBlock(block.type)}
                          disabled={blocked}
                          className="w-full rounded-lg border border-ink-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-200 disabled:hover:bg-white"
                        >
                          <span className="block text-sm font-semibold text-ink-900">{block.label}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                            {blocked ? 'Sudah dipakai — hanya boleh satu per halaman.' : block.description}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </Modal>
    </>
  )
}
