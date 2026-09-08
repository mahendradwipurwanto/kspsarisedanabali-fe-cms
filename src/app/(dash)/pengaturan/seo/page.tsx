'use client'

import { useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import {
  AI_CRAWLERS, DEFAULT_ANALYTICS, DEFAULT_SEO_TECH, GA_ID_RULE, GTM_ID_RULE,
  type AnalyticsSettings, type SeoTechSettings,
} from '@/contracts'
import { useSettings } from '@/lib/use-settings'
import {
  Card, PageHeader, Spinner, Button, IconButton, Field, Switch, Alert, inputCls, selectCls,
} from '@/components/ui'
import { PreviewCard } from '@/components/PreviewCard'
import { LP_URL as LP } from '@/lib/site'

interface SeoDefaults { titleTemplate: string; defaultTitle: string; defaultDescription: string }

/** Every group this screen owns, so Simpan writes exactly these and no others. */
const GROUPS = ['seoDefaults', 'seoTech', 'analytics']

const Count = ({ n, lo, hi }: { n: number; lo: number; hi: number }) => (
  <span className={`tnum text-[11.5px] ${n === 0 ? 'text-ink-400' : n < lo || n > hi ? 'text-gold-600' : 'text-green-700'}`}>{n} / {hi}</span>
)

/**
 * A list of short strings, typed one per line.
 *
 * Paths and profile addresses come in ones and twos and are pasted from
 * somewhere else; a row of add/remove buttons would be more machinery than the
 * job needs. Blank lines are dropped on the way in.
 */
function LineList({
  label, hint, value, onChange, placeholder, rows = 3,
}: {
  label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; rows?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (Array.isArray(value) ? value : []).join('\n')
  return (
    <Field label={label} hint={hint}>
      <textarea
        rows={rows}
        value={text}
        placeholder={placeholder}
        // Kept as raw text while it is being typed, so pressing Enter for the
        // next line does not get swallowed by a split/join round trip.
        onChange={(e) => { setDraft(e.target.value); onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean)) }}
        onBlur={() => setDraft(null)}
        className={`${inputCls} mono !text-[12.5px]`}
      />
    </Field>
  )
}

/** A link to the file this card configures, so it can be read as it is served. */
const FileLink = ({ path }: { path: string }) => (
  <a href={`${LP}${path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-green-700 underline-offset-4 hover:underline">
    {path} <ExternalLink className="size-3" aria-hidden="true" />
  </a>
)

export default function SeoSettingsPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const seo = s.group<SeoDefaults>('seoDefaults', { titleTemplate: '%s | KSP Sari Sedana Bali', defaultTitle: '', defaultDescription: '' })
  const setSeo = (k: keyof SeoDefaults, v: string) => s.setGroup('seoDefaults', { ...seo, [k]: v })

  const tech = s.group<SeoTechSettings>('seoTech', DEFAULT_SEO_TECH)
  const setTech = <K extends keyof SeoTechSettings>(k: K, v: SeoTechSettings[K]) => s.setGroup('seoTech', { ...tech, [k]: v })

  const gtm = s.group<AnalyticsSettings>('analytics', DEFAULT_ANALYTICS)
  const setGtm = <K extends keyof AnalyticsSettings>(k: K, v: AnalyticsSettings[K]) => s.setGroup('analytics', { ...gtm, [k]: v })

  const gtmIdError = gtm.gtmId && !GTM_ID_RULE.test(gtm.gtmId.trim()) ? 'Format ID tidak dikenali. Contoh: GTM-ABC1234' : undefined
  const gaIdError = gtm.gaId && !GA_ID_RULE.test(gtm.gaId.trim()) ? 'Format ID tidak dikenali. Contoh: G-ABC1234567' : undefined

  let schemaError: string | undefined
  if (tech.schemaExtra.trim()) {
    try { JSON.parse(tech.schemaExtra) } catch { schemaError = 'Bukan JSON yang sah — bagian ini akan diabaikan oleh website sampai diperbaiki.' }
  }

  const blocked = Array.isArray(tech.aiCrawlersBlocked) ? tech.aiCrawlersBlocked : []
  const toggleCrawler = (agent: string) =>
    setTech('aiCrawlersBlocked', blocked.includes(agent) ? blocked.filter((a) => a !== agent) : [...blocked, agent])

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="SEO"
        subtitle="Nilai bawaan untuk mesin pencari, berkas robots.txt, peta situs, feed berita, data terstruktur, dan Google Tag Manager. Tautan media sosial diatur di Footer."
        action={<Button variant="dark" onClick={() => void s.save(GROUPS)} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      {/* 6 : 4. Both tracks are minmax(0, …): a grid track sized by content
          alone refuses to shrink below it, which is how a long summary value
          pushed the right-hand card off the edge and gave the whole page a
          horizontal scrollbar. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
        <div className="grid min-w-0 gap-5">
          <Card title="Bawaan mesin pencari">
            <div className="grid gap-4">
              <Field label="Pola judul" hint="%s diganti dengan judul halaman. Contoh: %s | KSP Sari Sedana Bali">
                <input value={seo.titleTemplate} onChange={(e) => setSeo('titleTemplate', e.target.value)} className={`${inputCls} mono`} />
              </Field>
              <Field label="Judul bawaan" hint="Dipakai beranda dan halaman tanpa judul khusus. Idealnya 50–60 karakter." counter={<Count n={seo.defaultTitle.length} lo={50} hi={60} />}>
                <input value={seo.defaultTitle} onChange={(e) => setSeo('defaultTitle', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Deskripsi bawaan" hint="Kalimat di bawah judul pada hasil pencarian. Idealnya 120–158 karakter." counter={<Count n={seo.defaultDescription.length} lo={120} hi={158} />}>
                <textarea rows={3} value={seo.defaultDescription} onChange={(e) => setSeo('defaultDescription', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {/* ─────────────────────────── robots.txt ─────────────────────────── */}
          <Card title="robots.txt" description="Aturan yang dibaca mesin pencari sebelum menjelajah website." action={<FileLink path="/robots.txt" />}>
            <div className="grid gap-4">
              <Switch
                checked={tech.indexable}
                onChange={(v) => setTech('indexable', v)}
                label="Izinkan website muncul di mesin pencari"
                hint="Matikan hanya saat website belum siap dilihat umum. Seluruh halaman akan ditandai noindex dan robots.txt menolak semua penjelajah."
              />
              {!tech.indexable ? (
                <Alert tone="amber">Website sedang disembunyikan dari Google. Jangan lupa menyalakannya kembali setelah peluncuran.</Alert>
              ) : null}

              <LineList
                label="Halaman yang dilarang dijelajah"
                hint="Satu alamat per baris, diawali garis miring. Contoh: /rahasia/. Alamat bawaan (/api/, /pratinjau/, hasil profiling) selalu dilarang dan tidak perlu ditulis."
                placeholder={'/laporan-internal/\n/*?cetak='}
                value={tech.robotsDisallow}
                onChange={(v) => setTech('robotsDisallow', v)}
              />
              <LineList
                label="Pengecualian yang tetap boleh dijelajah"
                hint="Untuk satu berkas di dalam folder yang dilarang di atas."
                value={tech.robotsAllow}
                onChange={(v) => setTech('robotsAllow', v)}
                rows={2}
              />
              <Field label="Jeda antar permintaan (detik)" hint="0 berarti tanpa jeda. Naikkan hanya bila penjelajah membebani server; Google mengabaikan aturan ini.">
                <input
                  type="number" min={0} max={60} value={tech.crawlDelay}
                  onChange={(e) => setTech('crawlDelay', Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  className={`${inputCls} tnum`}
                />
              </Field>
              <Field label="Baris tambahan" hint="Ditulis apa adanya di akhir berkas, untuk aturan yang tidak tersedia di atas. Kosongkan bila ragu.">
                <textarea rows={2} value={tech.robotsExtra} onChange={(e) => setTech('robotsExtra', e.target.value)} className={`${inputCls} mono !text-[12.5px]`} />
              </Field>
            </div>
          </Card>

          {/* ──────────────────────────── sitemap ───────────────────────────── */}
          <Card title="Peta situs (sitemap)" description="Daftar alamat yang diserahkan ke Google agar halaman baru cepat ditemukan." action={<FileLink path="/sitemap.xml" />}>
            <div className="grid gap-3">
              <Switch checked={tech.sitemapEnabled} onChange={(v) => setTech('sitemapEnabled', v)} label="Sediakan peta situs" hint="Dibuat otomatis dari isi konsol dan diperbarui setiap kali ada yang diterbitkan." />
              {tech.sitemapEnabled ? (
                <>
                  <Switch checked={tech.sitemapInRobots} onChange={(v) => setTech('sitemapInRobots', v)} label="Umumkan di robots.txt" hint="Cara termudah agar mesin pencari menemukannya sendiri." />
                  <p className="mt-1 text-[12.5px] font-semibold text-ink-600">Isi yang dimasukkan</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Switch checked={tech.sitemapPages} onChange={(v) => setTech('sitemapPages', v)} label="Halaman" />
                    <Switch checked={tech.sitemapPosts} onChange={(v) => setTech('sitemapPosts', v)} label="Berita" />
                    <Switch checked={tech.sitemapProducts} onChange={(v) => setTech('sitemapProducts', v)} label="Produk" />
                    <Switch checked={tech.sitemapBranches} onChange={(v) => setTech('sitemapBranches', v)} label="Kantor" />
                    <Switch checked={tech.sitemapJobs} onChange={(v) => setTech('sitemapJobs', v)} label="Lowongan" />
                  </div>
                </>
              ) : (
                <Alert tone="amber">Tanpa peta situs, halaman baru butuh waktu jauh lebih lama untuk ditemukan Google.</Alert>
              )}
            </div>
          </Card>

          {/* ────────────────────────────── rss ─────────────────────────────── */}
          <Card title="Feed berita (RSS)" description="Agar pembaca dan agregator bisa berlangganan berita koperasi." action={<FileLink path="/rss.xml" />}>
            <div className="grid gap-4">
              <Switch checked={tech.rssEnabled} onChange={(v) => setTech('rssEnabled', v)} label="Sediakan feed berita" />
              {tech.rssEnabled ? (
                <>
                  <Field label="Jumlah berita di feed" hint="Antara 1 dan 50. Bawaan 30.">
                    <input
                      type="number" min={1} max={50} value={tech.rssLimit}
                      onChange={(e) => setTech('rssLimit', Math.max(1, Math.min(50, Number(e.target.value) || 30)))}
                      className={`${inputCls} tnum`}
                    />
                  </Field>
                  <Field label="Judul feed" hint="Kosongkan untuk memakai nama koperasi diikuti “— Berita”.">
                    <input value={tech.rssTitle} onChange={(e) => setTech('rssTitle', e.target.value)} className={inputCls} placeholder="KSP Sari Sedana Bali — Berita" />
                  </Field>
                  <Field label="Deskripsi feed" hint="Kosongkan untuk memakai deskripsi website.">
                    <textarea rows={2} value={tech.rssDescription} onChange={(e) => setTech('rssDescription', e.target.value)} className={inputCls} />
                  </Field>
                  <Switch
                    checked={tech.rssFullContent}
                    onChange={(v) => setTech('rssFullContent', v)}
                    label="Kirim isi berita lengkap"
                    hint="Mati: hanya ringkasan dan tautan, sehingga pembaca tetap datang ke website. Nyala: seluruh tulisan ikut, dan siapa pun bisa menyalinnya utuh."
                  />
                </>
              ) : null}
            </div>
          </Card>

          {/* ───────────────────────── AI crawlers ──────────────────────────── */}
          <Card title="Penjelajah AI" description="Robot yang mengambil isi website untuk melatih atau menjawab dengan model bahasa.">
            <div className="grid gap-4">
              <Field label="Perlakuan" hint="Aturan ini adalah permintaan, bukan penghalang teknis: robot yang patuh akan menurutinya, yang tidak patuh tetap bisa membaca. Menutup akses juga berarti koperasi tidak dikutip saat orang bertanya ke asisten AI.">
                <select value={tech.aiCrawlers} onChange={(e) => setTech('aiCrawlers', e.target.value as SeoTechSettings['aiCrawlers'])} className={selectCls}>
                  <option value="allow">Izinkan semua — isi website boleh dipakai</option>
                  <option value="block">Tolak semua penjelajah AI</option>
                  <option value="custom">Pilih sendiri mana yang ditolak</option>
                </select>
              </Field>

              {tech.aiCrawlers === 'custom' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {AI_CRAWLERS.map((c) => (
                    <Switch
                      key={c.agent}
                      checked={blocked.includes(c.agent)}
                      onChange={() => toggleCrawler(c.agent)}
                      label={`Tolak ${c.label}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          {/* ──────────────────── structured data (schema) ──────────────────── */}
          <Card title="Data terstruktur (Schema.org)" description="Keterangan tersembunyi yang membuat Google menampilkan koperasi sebagai lembaga, lengkap dengan alamat dan jam buka.">
            <div className="grid gap-4">
              <Switch checked={tech.schemaEnabled} onChange={(v) => setTech('schemaEnabled', v)} label="Sertakan data terstruktur di setiap halaman" />
              {tech.schemaEnabled ? (
                <>
                  <Field label="Jenis organisasi" hint="FinancialService memberi tampilan hasil pencarian paling lengkap untuk lembaga keuangan.">
                    <select value={tech.schemaType} onChange={(e) => setTech('schemaType', e.target.value as SeoTechSettings['schemaType'])} className={selectCls}>
                      <option value="FinancialService">FinancialService — lembaga jasa keuangan</option>
                      <option value="CreditUnion">CreditUnion — koperasi simpan pinjam</option>
                      <option value="LocalBusiness">LocalBusiness — usaha lokal</option>
                      <option value="Organization">Organization — organisasi umum</option>
                    </select>
                  </Field>
                  <Switch checked={tech.schemaWebsite} onChange={(v) => setTech('schemaWebsite', v)} label="Sertakan keterangan WebSite" hint="Membantu Google menampilkan nama website, bukan hanya alamatnya." />
                  <Switch
                    checked={tech.schemaSearchAction}
                    onChange={(v) => setTech('schemaSearchAction', v)}
                    label="Umumkan kotak pencarian di hasil Google"
                    hint="Hanya nyalakan bila pencarian di website memang berjalan; mengaku punya pencarian yang tidak bekerja lebih merugikan daripada tidak mengaku."
                  />
                  <LineList
                    label="Profil resmi lain"
                    hint="Satu alamat lengkap per baris (diawali https://). Tautan media sosial di Footer sudah otomatis ikut; ini untuk yang di luar itu, misalnya halaman Google Bisnisku."
                    value={tech.schemaSameAs}
                    onChange={(v) => setTech('schemaSameAs', v)}
                    rows={2}
                  />
                  <Field label="Data terstruktur tambahan" hint="JSON-LD mentah, satu objek atau satu larik. Untuk keperluan lanjutan — kosongkan bila ragu." error={schemaError}>
                    <textarea rows={4} value={tech.schemaExtra} onChange={(e) => setTech('schemaExtra', e.target.value)} className={`${inputCls} mono !text-[12.5px]`} placeholder='{"@context":"https://schema.org","@type":"…"}' />
                  </Field>
                </>
              ) : null}
            </div>
          </Card>

          {/* ────────────────────────────── GTM ─────────────────────────────── */}
          <Card title="Google Tag Manager" description="Satu wadah untuk semua kode pelacakan, diatur tanpa perlu mengubah kode website.">
            <div className="grid gap-4">
              <Field label="ID wadah (container)" hint="Salin dari Google Tag Manager. Kosongkan untuk tidak memuat apa pun." error={gtmIdError}>
                <input value={gtm.gtmId} onChange={(e) => setGtm('gtmId', e.target.value.trim().toUpperCase())} placeholder="GTM-ABC1234" className={`${inputCls} mono`} />
              </Field>

              <Field
                label="ID Google Analytics 4"
                hint="Hanya dipakai bila ID wadah di atas kosong. Bila keduanya diisi, GTM yang mengurus Analytics — memuat keduanya membuat setiap kunjungan terhitung dua kali."
                error={gaIdError}
              >
                <input value={gtm.gaId} onChange={(e) => setGtm('gaId', e.target.value.trim().toUpperCase())} placeholder="G-ABC1234567" className={`${inputCls} mono`} disabled={Boolean(gtm.gtmId)} />
              </Field>

              <Switch
                checked={gtm.consentMode}
                onChange={(v) => setGtm('consentMode', v)}
                label="Tunggu persetujuan pengunjung sebelum melacak"
                hint="Menyetel Consent Mode ke “denied” sampai wadah GTM menerima persetujuan. Nyalakan hanya bila di dalam GTM sudah ada mekanisme persetujuannya — bila tidak, tidak akan ada data yang tercatat sama sekali."
              />

              <Field label="Awalan kelas pelacakan" hint="Ditempelkan di depan setiap “Kelas CSS untuk GTM” yang diisi di blok halaman, sehingga satu aturan di GTM bisa menangkap semuanya.">
                <input value={gtm.classPrefix} onChange={(e) => setGtm('classPrefix', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} placeholder="ksp-" className={`${inputCls} mono`} />
              </Field>

              <DataLayerEditor value={gtm.dataLayer} onChange={(v) => setGtm('dataLayer', v)} />
            </div>
          </Card>
        </div>

        <div className="grid h-fit min-w-0 gap-5 [&>*]:min-w-0 xl:sticky xl:top-20">
          <PreviewCard title="Tampilan di Google" description="Untuk halaman yang memakai nilai bawaan.">
            <div className="rounded-[var(--radius-tile)] border border-line bg-white p-3.5">
              <p className="flex min-w-0 items-center gap-2 text-[11.5px] text-ink-500">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-green-600 text-[9px] font-bold text-white">S</span>
                <span className="truncate">{LP.replace(/^https?:\/\//, '')}</span>
              </p>
              <p className="mt-1.5 truncate text-[16px] text-[#1a0dab]">{seo.defaultTitle || 'Judul bawaan belum diisi'}</p>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">{seo.defaultDescription || 'Deskripsi bawaan belum diisi. Google akan memilih kalimat acak dari halaman.'}</p>
            </div>
            {!tech.indexable ? (
              <p className="mt-3 text-[12.5px] font-semibold text-gold-700">Website sedang disembunyikan — hasil ini tidak akan muncul sama sekali.</p>
            ) : null}
          </PreviewCard>

          <PreviewCard title="Ringkasan" description="Keadaan berkas SEO saat ini.">
            <dl className="grid gap-2 text-[12.5px]">
              <Summary label="Terindeks Google" value={tech.indexable ? 'Ya' : 'Tidak'} warn={!tech.indexable} />
              <Summary label="Peta situs" value={tech.sitemapEnabled ? 'Aktif' : 'Nonaktif'} warn={!tech.sitemapEnabled} />
              <Summary label="Feed berita" value={tech.rssEnabled ? `Aktif · ${tech.rssLimit} berita` : 'Nonaktif'} />
              <Summary
                label="Penjelajah AI"
                value={tech.aiCrawlers === 'allow' ? 'Diizinkan' : tech.aiCrawlers === 'block' ? 'Ditolak semua' : `${blocked.length} ditolak`}
              />
              <Summary label="Data terstruktur" value={tech.schemaEnabled ? tech.schemaType : 'Nonaktif'} />
              <Summary label="Tag Manager" value={gtm.gtmId || (gtm.gaId ? `GA4 ${gtm.gaId}` : 'Belum diatur')} />
            </dl>
          </PreviewCard>
        </div>
      </div>
    </>
  )
}

function Summary({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5 last:border-0">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      {/* `break-words` rather than a truncation: "FinancialService" and a
          container id are the answer, not a decoration, and an ellipsis would
          hide the half that identifies which one it is. */}
      <dd className={`mono min-w-0 break-words text-right text-[12px] font-semibold ${warn ? 'text-gold-700' : 'text-ink-900'}`} title={value}>{value}</dd>
    </div>
  )
}

/**
 * Variables pushed onto the dataLayer on every page.
 *
 * A pair at a time rather than a JSON box: these are read inside GTM by name,
 * and a typo in a brace would silently take the whole push with it.
 */
function DataLayerEditor({
  value, onChange,
}: {
  value: { key: string; value: string }[]
  onChange: (v: { key: string; value: string }[]) => void
}) {
  const rows = Array.isArray(value) ? value : []
  const set = (i: number, patch: Partial<{ key: string; value: string }>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)))

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">Variabel dataLayer</span>
      <p className="mb-2.5 text-[12px] leading-relaxed text-ink-500">
        Nilai tetap yang dikirim ke GTM di setiap halaman, misalnya <span className="mono">site_env</span> = <span className="mono">produksi</span>. Jangan isi apa pun yang bersifat rahasia — semuanya terbaca di kode halaman.
      </p>

      <div className="grid gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.key}
              onChange={(e) => set(i, { key: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
              placeholder="nama"
              aria-label={`Nama variabel ${i + 1}`}
              className={`${inputCls} mono !w-[38%]`}
            />
            <input
              value={row.value}
              onChange={(e) => set(i, { value: e.target.value })}
              placeholder="nilai"
              aria-label={`Nilai variabel ${i + 1}`}
              className={`${inputCls} mono`}
            />
            <IconButton label={`Hapus variabel ${row.key || i + 1}`} onClick={() => onChange(rows.filter((_, n) => n !== i))} className="hover:!text-red-600">
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" className="mt-2.5" onClick={() => onChange([...rows, { key: '', value: '' }])}>
        <Plus className="size-3.5" /> Tambah variabel
      </Button>
    </div>
  )
}
