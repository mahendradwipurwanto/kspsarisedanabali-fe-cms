'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Empty, fmtRelative, fmtDate } from '@/components/ui'
import { TrendChart, BarList } from '@/components/dashboard/Charts'

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3000'

/* ─────────────────────────────────────────── shapes returned by the API ── */

interface Overview {
  views: { value: number; changePct: number }
  visitors: { value: number; changePct: number }
  leads: { value: number; changePct: number }
}
interface FunnelStep { key: string; label: string; value: number; conversionPct: number }
interface LeadSummary { byStatus: Record<string, number>; untouchedOver24h: number; today: number }
interface LeadRow { id: string; name: string; phone: string; status: string; productName?: string | null; branchName?: string | null; createdAt: string }
interface DevicePoint { device: string; views: number; pct: number }
interface SourcePoint { source: string; views: number }
interface PagePoint { path: string; views: number; visitors: number }
interface TimePoint { date: string; views: number; visitors: number }
interface LeadsInsights {
  bySource: { source: string; count: number }[]
  byBranch: { branchId: string | null; branchName: string; count: number }[]
  byProduct: { productId: string; productName: string; category: string; count: number }[]
  conversionPct: number
  avgResponseHours: number | null
}
interface ContentHealth {
  pages: {
    total: number; published: number; draft: number; avgSeoScore: number
    distribution: { good: number; warn: number; bad: number }
    needsAttention: { id: string; title: string; slug: string; status: string; score: number }[]
  }
  posts: { total: number; published: number; draft: number }
  products: { total: number; verified: number; active: number }
  branches: { total: number; active: number }
  jobs: { total: number; open: number; applications: number; pendingApplications: number }
  media: { total: number; missingAlt: number; totalSizeMb: number }
  testimonials: { total: number; active: number }
  faqs: { total: number; active: number }
  documents: { total: number }
  users: { total: number; active: number }
}
interface AuditRow { id: string; action: string; entity: string; entityId: string | null; summary: string | null; userName: string | null; createdAt: string }

/** Shape of GET /analytics/dashboard — one request standing in for what used
 *  to be overview + funnel + devices + sources + pages + timeseries + content. */
interface DashboardData {
  overview: Overview | null
  funnel: { steps: FunnelStep[] } | null
  topPages: PagePoint[]
  sources: SourcePoint[]
  timeseries: TimePoint[]
  devices: DevicePoint[]
  content: ContentHealth | null
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'grey' | 'red'> = {
  baru: 'green', diproses: 'amber', selesai: 'grey', ditolak: 'red',
}
const STATUS_LABEL: Record<string, string> = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak' }
const SOURCE_LABEL: Record<string, string> = {
  profiling: 'Profiling', contact_form: 'Formulir Kontak', suggestion: 'Saran', career: 'Karir', whatsapp: 'WhatsApp', manual: 'Manual',
}
const DEVICE_LABEL: Record<string, string> = { desktop: 'Desktop', mobile: 'Ponsel', tablet: 'Tablet', unknown: 'Tidak diketahui' }
const CATEGORY_LABEL: Record<string, string> = { simpanan: 'Simpanan', pinjaman: 'Pinjaman' }
const ACTION_LABEL: Record<string, string> = {
  create: 'membuat', update: 'mengubah', delete: 'menghapus', publish: 'menerbitkan',
  unpublish: 'membatalkan penerbitan', restore: 'memulihkan', assign: 'menugaskan', upload: 'mengunggah', login: 'masuk',
}
const ENTITY_LABEL: Record<string, string> = {
  page: 'halaman', post: 'berita', product: 'produk', branch: 'kantor', user: 'pengguna',
  role: 'peran', lead: 'calon nasabah', media: 'media', job: 'lowongan', settings: 'pengaturan',
}
const RANGES = [7, 30, 90] as const

const trend = (pct: number) => (
  <span className={`tnum text-xs font-semibold ${pct > 0 ? 'text-brand-600' : pct < 0 ? 'text-[#c4443a]' : 'text-ink-400'}`}>
    {pct > 0 ? '▲' : pct < 0 ? '▼' : '—'} {Math.abs(pct)}%
  </span>
)

/** A number Wix and WordPress both lead with: what score should this page get,
 *  and does that score put it above or below the line that blocks publishing. */
function ScorePill({ score }: { score: number }) {
  const tone = score >= 85 ? 'green' : score >= 60 ? 'amber' : 'red'
  return <Pill tone={tone}>{score}%</Pill>
}

/** A compact content-inventory tile: a number, what it is, and — where a
 *  management page actually exists — a link into it. */
function InventoryTile({ label, value, note, href }: { label: string; value: string | number; note?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="tnum mt-1 text-xl font-bold text-ink-900">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-ink-500">{note}</p> : null}
    </>
  )
  return href ? (
    <Link href={href} className="block rounded-lg border border-ink-200 p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3.5">{body}</div>
  )
}

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-bold text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export default function DashboardHome() {
  const { user, can } = useAuth()
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)

  const [overview, setOverview] = useState<Overview | null>(null)
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [summary, setSummary] = useState<LeadSummary | null>(null)
  const [recent, setRecent] = useState<LeadRow[]>([])
  const [devices, setDevices] = useState<DevicePoint[]>([])
  const [sources, setSources] = useState<SourcePoint[]>([])
  const [topPages, setTopPages] = useState<PagePoint[]>([])
  const [timeseries, setTimeseries] = useState<TimePoint[]>([])
  const [leadsInsights, setLeadsInsights] = useState<LeadsInsights | null>(null)
  const [content, setContent] = useState<ContentHealth | null>(null)
  const [activity, setActivity] = useState<AuditRow[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void (async () => {
      setRefreshing(true)
      const jobs: Promise<unknown>[] = []

      if (can('analytics:read')) {
        // One request instead of seven: each used to be its own HTTP call,
        // fired in parallel, all racing the same production connection pool
        // (`max: 1`) under independent 20s deadlines. One slow section could
        // trip its own deadline and, by rebuilding the pool, take the other
        // six down with it. /dashboard runs them server-side and settles
        // each independently, so a single request now carries the same risk
        // a single request always did — not seven requests' worth of it.
        jobs.push(
          api.get<{ data: DashboardData }>(`/analytics/dashboard?days=${range}`).then((r) => {
            setOverview(r.data.overview)
            setFunnel(r.data.funnel?.steps ?? [])
            setDevices(r.data.devices)
            setSources(r.data.sources)
            setTopPages(r.data.topPages)
            setTimeseries(r.data.timeseries)
            setContent(r.data.content)
          }).catch(() => {}),
        )
      }
      if (can('leads:read:all', 'leads:read:branch')) {
        jobs.push(
          api.get<{ data: LeadSummary }>('/leads/summary').then((r) => setSummary(r.data)).catch(() => {}),
          api.get<{ data: LeadRow[] }>('/leads?limit=6').then((r) => setRecent(r.data)).catch(() => {}),
          api.get<{ data: LeadsInsights }>(`/analytics/leads?days=${range}`).then((r) => setLeadsInsights(r.data)).catch(() => {}),
        )
      }
      if (can('audit:read')) {
        jobs.push(api.get<{ data: AuditRow[] }>('/audit?limit=8').then((r) => setActivity(r.data)).catch(() => {}))
      }

      await Promise.all(jobs)
      setLoading(false)
      setRefreshing(false)
    })()
  }, [can, range])

  if (loading) return <Spinner />

  const visitors = overview?.visitors.value ?? 0
  const leadsInRange = overview?.leads.value ?? 0
  const conversionPct = visitors > 0 ? Math.round((leadsInRange / visitors) * 1000) / 10 : 0

  const cards = [
    overview && { label: 'Pengunjung', value: overview.visitors.value, pct: overview.visitors.changePct, note: `orang unik, ${range} hari` },
    overview && { label: 'Kunjungan Halaman', value: overview.views.value, pct: overview.views.changePct, note: 'total kunjungan halaman' },
    overview && { label: 'Calon Nasabah Masuk', value: overview.leads.value, pct: overview.leads.changePct, note: `dalam ${range} hari` },
    overview && { label: 'Tingkat Konversi', value: conversionPct, suffix: '%', pct: null, note: 'pengunjung → calon nasabah' },
    summary && { label: 'Calon Nasabah Hari Ini', value: summary.today, pct: null, note: 'masuk sejak pagi' },
    summary && { label: 'Belum Dihubungi', value: summary.byStatus.baru ?? 0, pct: null, note: 'berstatus "Baru"' },
  ].filter(Boolean) as { label: string; value: number; suffix?: string; pct: number | null; note: string }[]

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={`Ringkasan performa website — ${range} hari terakhir.${refreshing ? ' Memperbarui…' : ''}`}
        action={
          <div className="flex rounded-lg border border-ink-200 p-0.5" role="group" aria-label="Rentang waktu">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                aria-pressed={range === d}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === d ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                {d} hari
              </button>
            ))}
          </div>
        }
      />

      {/* The number that matters most: leads sitting untouched past a day. */}
      {summary && summary.untouchedOver24h > 0 ? (
        <Link href="/leads?status=baru" className="mb-6 block rounded-xl bg-[#fdf1f0] p-4 ring-1 ring-inset ring-[#f0c8c4] hover:bg-[#fbe7e5]">
          <p className="font-semibold text-[#a3352c]">
            {summary.untouchedOver24h} calon nasabah belum dihubungi lebih dari 24 jam
          </p>
          <p className="mt-0.5 text-sm text-[#a3352c]/80">Klik untuk melihat dan menindaklanjuti sekarang.</p>
        </Link>
      ) : null}

      {cards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.label} className="p-5">
              <p className="text-sm font-medium text-ink-500">{c.label}</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tnum text-2xl font-bold tracking-tight text-ink-900">
                  {c.value.toLocaleString('id-ID')}{c.suffix ?? ''}
                </span>
                {c.pct !== null ? trend(c.pct) : null}
              </div>
              <p className="mt-1 text-xs text-ink-400">{c.note}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {timeseries.length ? (
        <Card className="mt-6 p-5 sm:p-6">
          <SectionHeading title="Tren kunjungan" subtitle="Kunjungan halaman dan pengunjung unik setiap hari. Arahkan kursor untuk melihat angka pasti." />
          <TrendChart points={timeseries} />
        </Card>
      ) : null}

      {funnel.length ? (
        <Card className="mt-6 p-5 sm:p-6">
          <SectionHeading title="Perjalanan pengunjung menjadi calon nasabah" subtitle="Angka di kanan menunjukkan berapa persen yang lanjut dari langkah sebelumnya." />
          <ul className="space-y-2.5">
            {funnel.map((step, i) => {
              const max = funnel[0]?.value || 1
              const width = Math.max((step.value / max) * 100, 2)
              return (
                <li key={step.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink-700">{step.label}</span>
                    <span className="tnum text-ink-500">
                      <strong className="text-ink-900">{step.value.toLocaleString('id-ID')}</strong>
                      {i > 0 ? <span className="ml-2 text-xs">({step.conversionPct}%)</span> : null}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${width}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      {sources.length || devices.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {sources.length ? (
            <Card className="p-5 sm:p-6">
              <SectionHeading title="Sumber kunjungan" subtitle="Dari mana pengunjung datang." />
              <BarList items={sources.map((s) => ({ label: s.source, value: s.views }))} />
            </Card>
          ) : null}
          {devices.length ? (
            <Card className="p-5 sm:p-6">
              <SectionHeading title="Perangkat" subtitle="Ponsel atau desktop — menentukan tampilan mana yang harus diprioritaskan." />
              <BarList
                tone="gold"
                items={devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, value: d.views, hint: `${d.pct}%` }))}
              />
            </Card>
          ) : null}
        </div>
      ) : null}

      {topPages.length ? (
        <Card className="mt-6">
          <div className="border-b border-ink-200 px-5 py-4">
            <SectionHeading title="Halaman terpopuler" subtitle={`${range} hari terakhir, diurutkan dari kunjungan terbanyak.`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2.5 font-semibold">Alamat</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Kunjungan</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Pengunjung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {topPages.slice(0, 10).map((p) => (
                  <tr key={p.path}>
                    <td className="px-5 py-3">
                      <a href={`${LP}${p.path}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                        {p.path}
                      </a>
                    </td>
                    <td className="tnum px-5 py-3 text-right text-ink-800">{p.views.toLocaleString('id-ID')}</td>
                    <td className="tnum px-5 py-3 text-right text-ink-500">{p.visitors.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {content ? (
        <>
          <div className="mt-8 mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ink-900">Isi website</h2>
            <p className="text-sm text-ink-500">Semua yang tersimpan di CMS, dalam satu pandangan.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <InventoryTile label="Halaman" value={content.pages.total} note={`${content.pages.published} terbit, ${content.pages.draft} draf`} href="/halaman" />
            <InventoryTile label="Berita & Artikel" value={content.posts.total} note={`${content.posts.published} terbit`} href="/berita" />
            <InventoryTile label="Produk" value={content.products.total} note={`${content.products.verified} suku bunga terverifikasi`} href="/produk" />
            <InventoryTile label="Kantor Cabang" value={content.branches.total} note={`${content.branches.active} aktif`} href="/kantor" />
            <InventoryTile
              label="Media"
              value={content.media.total}
              note={content.media.missingAlt > 0 ? `${content.media.missingAlt} tanpa keterangan gambar` : `${content.media.totalSizeMb} MB tersimpan`}
              href="/media"
            />
            <InventoryTile label="Lowongan Karir" value={content.jobs.total} note={`${content.jobs.open} dibuka, ${content.jobs.pendingApplications} lamaran baru`} />
            <InventoryTile label="Testimoni" value={content.testimonials.total} note={`${content.testimonials.active} tampil di website`} />
            <InventoryTile label="Tanya Jawab" value={content.faqs.total} note={`${content.faqs.active} tampil di website`} />
            <InventoryTile label="Dokumen & Laporan" value={content.documents.total} />
            <InventoryTile label="Pengguna CMS" value={content.users.total} note={`${content.users.active} aktif`} href="/pengguna" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card className="p-5 sm:p-6">
              <SectionHeading title="Kesiapan SEO" subtitle="Rata-rata skor seluruh halaman, dihitung dengan cara yang sama seperti di editor." />
              <div className="flex items-center gap-4">
                <span className={`tnum text-4xl font-extrabold ${content.pages.avgSeoScore >= 85 ? 'text-brand-600' : content.pages.avgSeoScore >= 60 ? 'text-[#8a6a10]' : 'text-[#a3352c]'}`}>
                  {content.pages.avgSeoScore}%
                </span>
                <ul className="text-sm text-ink-600">
                  <li><span className="mr-1.5 inline-block size-2 rounded-full bg-brand-500" />{content.pages.distribution.good} halaman baik</li>
                  <li><span className="mr-1.5 inline-block size-2 rounded-full bg-[#d9a521]" />{content.pages.distribution.warn} perlu diperbaiki</li>
                  <li><span className="mr-1.5 inline-block size-2 rounded-full bg-[#c4443a]" />{content.pages.distribution.bad} bermasalah</li>
                </ul>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <SectionHeading title="Halaman perlu perhatian" subtitle="Skor SEO di bawah 85%, diurutkan dari yang paling perlu diperbaiki." />
              {content.pages.needsAttention.length ? (
                <ul className="divide-y divide-ink-100">
                  {content.pages.needsAttention.map((p) => (
                    <li key={p.id}>
                      <Link href={`/halaman/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-700">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink-800">{p.title}</span>
                          <span className="block truncate text-xs text-ink-400">/{p.slug === '/' ? '' : p.slug}</span>
                        </span>
                        <ScorePill score={p.score} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-ink-400">Semua halaman sudah punya skor SEO yang baik.</p>
              )}
            </Card>
          </div>
        </>
      ) : null}

      {leadsInsights ? (
        <>
          <div className="mt-8 mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ink-900">Wawasan calon nasabah</h2>
            <p className="text-sm text-ink-500">{range} hari terakhir.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm font-medium text-ink-500">Tingkat konversi</p>
              <p className="tnum mt-1.5 text-2xl font-bold text-ink-900">{leadsInsights.conversionPct}%</p>
              <p className="mt-1 text-xs text-ink-400">calon nasabah yang berstatus &ldquo;Selesai&rdquo;</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-medium text-ink-500">Rata-rata waktu respon</p>
              <p className="tnum mt-1.5 text-2xl font-bold text-ink-900">
                {leadsInsights.avgResponseHours === null ? '—' : `${leadsInsights.avgResponseHours} jam`}
              </p>
              <p className="mt-1 text-xs text-ink-400">dari masuk sampai pertama kali dihubungi</p>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <SectionHeading title="Sumber" />
              <BarList items={leadsInsights.bySource.map((s) => ({ label: SOURCE_LABEL[s.source] ?? s.source, value: s.count }))} />
            </Card>
            <Card className="p-5">
              <SectionHeading title="Kantor cabang" />
              <BarList items={leadsInsights.byBranch.map((b) => ({ label: b.branchName, value: b.count }))} tone="gold" />
            </Card>
            <Card className="p-5">
              <SectionHeading title="Produk diminati" />
              <BarList
                items={leadsInsights.byProduct.map((p) => ({
                  label: p.productName, value: p.count, hint: CATEGORY_LABEL[p.category] ?? p.category,
                }))}
              />
            </Card>
          </div>
        </>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {can('leads:read:all', 'leads:read:branch') ? (
          <Card>
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
              <h2 className="font-bold text-ink-900">Calon nasabah terbaru</h2>
              <Link href="/leads" className="text-sm font-semibold text-brand-700 hover:underline">Lihat semua</Link>
            </div>
            {recent.length ? (
              <ul className="divide-y divide-ink-200">
                {recent.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads?lead=${lead.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-ink-50">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink-900">{lead.name}</span>
                        <span className="block truncate text-sm text-ink-500">
                          {[lead.productName, lead.branchName].filter(Boolean).join(' · ') || lead.phone}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-xs text-ink-400 sm:inline">{fmtRelative(lead.createdAt)}</span>
                        <Pill tone={STATUS_TONE[lead.status] ?? 'grey'}>{STATUS_LABEL[lead.status] ?? lead.status}</Pill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <Empty title="Belum ada calon nasabah" body="Data akan muncul di sini begitu ada pengunjung yang mengisi formulir di website." />
              </div>
            )}
          </Card>
        ) : null}

        {can('audit:read') ? (
          <Card>
            <div className="border-b border-ink-200 px-5 py-4">
              <h2 className="font-bold text-ink-900">Aktivitas terbaru</h2>
            </div>
            {activity.length ? (
              <ul className="divide-y divide-ink-200">
                {activity.map((row) => (
                  <li key={row.id} className="px-5 py-3">
                    <p className="text-sm text-ink-700">
                      <span className="font-semibold text-ink-900">{row.userName ?? 'Sistem'}</span>
                      {' '}{ACTION_LABEL[row.action] ?? row.action} {ENTITY_LABEL[row.entity] ?? row.entity}
                      {row.summary ? <span className="text-ink-500"> — {row.summary}</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400" title={fmtDate(row.createdAt)}>{fmtRelative(row.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-400">Belum ada aktivitas tercatat.</p>
            )}
          </Card>
        ) : null}
      </div>
    </>
  )
}
