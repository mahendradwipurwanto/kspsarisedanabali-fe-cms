'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowUpRight, PhoneCall, TrendingDown, TrendingUp, Minus, AlertTriangle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Empty, fmtRelative, fmtDate } from '@/components/ui'
import { TrendChart, BarList, Funnel, type TrendMetric } from '@/components/dashboard/Charts'
import { LP_URL as LP } from '@/lib/site'
import { cn } from '@/lib/utils'

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
const DEVICE_LABEL: Record<string, string> = { desktop: 'Desktop', mobile: 'Ponsel', tablet: 'Tablet', unknown: 'Lainnya' }
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

const id = (n: number) => n.toLocaleString('id-ID')

/* ───────────────────────────────── pieces the dashboard is built from ── */

/** Movement against the period before this one, as a chip rather than a footnote. */
function Delta({ pct, invert }: { pct: number; invert?: boolean }) {
  const flat = pct === 0
  const good = invert ? pct < 0 : pct > 0
  const Icon = flat ? Minus : pct > 0 ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold',
        flat ? 'bg-ink-100 text-ink-500' : good ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {flat ? '0' : `${Math.abs(pct)}`}%
    </span>
  )
}

/**
 * One headline number.
 *
 * Every card carried the same weight before, which is what made the page read
 * as a report: nothing told the reader where to look first. These four are the
 * measures of the website; the queue below them is the work.
 */
function Kpi({ label, value, suffix, delta, note }: {
  label: string; value: number; suffix?: string; delta?: number | null; note: string
}) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[12.5px] font-medium text-ink-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="tnum text-[26px] font-extrabold leading-none tracking-[-0.02em] text-ink-900">
          {id(value)}{suffix ?? ''}
        </span>
        {delta !== null && delta !== undefined ? <Delta pct={delta} /> : null}
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-ink-400">{note}</p>
    </Card>
  )
}

/** A number that is also a job: it links to the queue it counts. */
function QueueCard({ label, value, note, href, tone, icon }: {
  label: string; value: number; note: string; href: string; tone: 'amber' | 'plain'; icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group/q flex items-center gap-3.5 rounded-[var(--radius-card)] border p-4 transition-colors sm:p-5',
        tone === 'amber'
          ? 'border-gold-200 bg-gold-50 hover:border-gold-400'
          : 'border-line bg-white shadow-[var(--shadow-card)] hover:border-ink-900',
      )}
    >
      <span className={cn(
        'grid size-10 shrink-0 place-items-center rounded-[var(--radius-tile)]',
        tone === 'amber' ? 'bg-gold-100 text-gold-700' : 'bg-paper text-ink-500',
      )}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[12.5px] font-medium', tone === 'amber' ? 'text-gold-700' : 'text-ink-500')}>{label}</span>
        <span className="tnum block text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink-900">{id(value)}</span>
        <span className={cn('block text-[11.5px]', tone === 'amber' ? 'text-gold-700' : 'text-ink-400')}>{note}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover/q:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

/** A compact metric block for the content inventory — data kept, weight reduced. */
function Tally({ label, value, note, href }: { label: string; value: number; note?: string; href?: string }) {
  const body = (
    <>
      <p className="tnum text-[19px] font-bold leading-none text-ink-900">{id(value)}</p>
      <p className="mt-1.5 text-[12px] font-medium text-ink-600">{label}</p>
      {note ? <p className="mt-0.5 truncate text-[11px] text-ink-400">{note}</p> : null}
    </>
  )
  return href ? (
    <Link href={href} className="block rounded-[var(--radius-tile)] border border-line p-3 transition-colors hover:border-ink-900 hover:bg-paper">{body}</Link>
  ) : (
    <div className="rounded-[var(--radius-tile)] border border-line bg-paper/60 p-3">{body}</div>
  )
}

function SeeAll({ href, children = 'Lihat semua' }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-green-700 hover:text-green-800">
      {children} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

/* ─────────────────────────────────────────────────────────────── screen ── */

export default function DashboardHome() {
  const { user, can } = useAuth()
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [metric, setMetric] = useState<TrendMetric>('both')

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
    let live = true
    void (async () => {
      setRefreshing(true)

      /*
       * One request at a time, on purpose.
       *
       * The API already folded seven analytics queries into `/dashboard` because
       * production runs a one-connection pool and a request that trips its
       * deadline tears that connection out from under everything else in
       * flight. Firing the four remaining calls together puts the page straight
       * back into that race: on a slow day the whole traffic section, or the
       * lead insights, would simply not appear — no error, just a shorter page,
       * different on every reload. Sequential costs a few hundred milliseconds
       * and makes the dashboard show the same thing every time.
       *
       * Each step still swallows its own failure, so one bad section leaves the
       * rest of the page standing.
       */
      const step = async (run: () => Promise<void>) => { if (live) await run().catch(() => {}) }

      if (can('analytics:read')) {
        await step(async () => {
          const r = await api.get<{ data: DashboardData }>(`/analytics/dashboard?days=${range}`)
          if (!live) return
          setOverview(r.data.overview)
          setFunnel(r.data.funnel?.steps ?? [])
          setDevices(r.data.devices)
          setSources(r.data.sources)
          setTopPages(r.data.topPages)
          setTimeseries(r.data.timeseries)
          setContent(r.data.content)
        })
      }
      // Paint as soon as the traffic section is in. Waiting for all of them
      // before dropping the spinner is what sequential loading would otherwise
      // cost the reader; this way the page fills in while they read the top of it.
      if (live) setLoading(false)

      if (can('leads:read:all', 'leads:read:branch')) {
        await step(async () => { const r = await api.get<{ data: LeadSummary }>('/leads/summary'); if (live) setSummary(r.data) })
        await step(async () => { const r = await api.get<{ data: LeadRow[] }>('/leads?limit=6'); if (live) setRecent(r.data) })
        await step(async () => { const r = await api.get<{ data: LeadsInsights }>(`/analytics/leads?days=${range}`); if (live) setLeadsInsights(r.data) })
      }
      if (can('audit:read')) {
        await step(async () => { const r = await api.get<{ data: AuditRow[] }>('/audit?limit=8'); if (live) setActivity(r.data) })
      }

      if (!live) return
      setLoading(false)
      setRefreshing(false)
    })()
    return () => { live = false }
  }, [can, range])

  const visitors = overview?.visitors.value ?? 0
  const leadsInRange = overview?.leads.value ?? 0
  const conversionPct = visitors > 0 ? Math.round((leadsInRange / visitors) * 1000) / 10 : 0
  const untouched = summary?.untouchedOver24h ?? 0

  /**
   * What is actually asking for the administrator's time, worst first. This
   * section only exists when something is wrong — an empty "all clear" panel
   * would be one more thing to read past every morning.
   */
  const attention = useMemo(() => {
    const items: { key: string; text: string; cta: string; href: string }[] = []
    if (untouched > 0) {
      items.push({
        key: 'untouched',
        text: `${id(untouched)} calon nasabah belum dihubungi lebih dari 24 jam`,
        cta: 'Hubungi sekarang',
        href: '/leads?status=baru',
      })
    }
    if (overview && overview.leads.changePct < 0) {
      items.push({
        key: 'leads-down',
        text: `Calon nasabah masuk turun ${Math.abs(overview.leads.changePct)}% dibanding ${range} hari sebelumnya`,
        cta: 'Lihat calon nasabah',
        href: '/leads',
      })
    }
    if (content && content.pages.distribution.bad > 0) {
      items.push({
        key: 'seo',
        text: `${id(content.pages.distribution.bad)} halaman punya skor SEO bermasalah`,
        cta: 'Perbaiki halaman',
        href: '/halaman',
      })
    }
    if (content && content.media.missingAlt > 0) {
      items.push({
        key: 'alt',
        text: `${id(content.media.missingAlt)} gambar belum punya keterangan`,
        cta: 'Lengkapi media',
        href: '/media',
      })
    }
    if (content && content.jobs.pendingApplications > 0) {
      items.push({
        key: 'jobs',
        text: `${id(content.jobs.pendingApplications)} lamaran kerja belum ditinjau`,
        cta: 'Lihat lowongan',
        href: '/lowongan',
      })
    }
    return items.slice(0, 3)
  }, [untouched, overview, content, range])

  if (loading) return <Spinner />

  const seoScore = content?.pages.avgSeoScore ?? 0
  const seoTone = seoScore >= 85 ? 'green' : seoScore >= 60 ? 'gold' : 'red'

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={`Performa website dan antrean calon nasabah, ${range} hari terakhir.${refreshing ? ' Memperbarui…' : ''}`}
        action={
          <div className="flex rounded-[var(--radius-input)] border border-line bg-white p-0.5" role="group" aria-label="Rentang waktu">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                aria-pressed={range === d}
                className={cn(
                  'rounded-[6px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                  range === d ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-paper hover:text-ink-900',
                )}
              >
                {d} hari
              </button>
            ))}
          </div>
        }
      />

      {/* ── the four measures of the website ── */}
      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
          <Kpi label="Pengunjung" value={overview.visitors.value} delta={overview.visitors.changePct} note={`orang unik, vs ${range} hari sebelumnya`} />
          <Kpi label="Kunjungan halaman" value={overview.views.value} delta={overview.views.changePct} note={`vs ${range} hari sebelumnya`} />
          <Kpi label="Calon nasabah" value={overview.leads.value} delta={overview.leads.changePct} note={`vs ${range} hari sebelumnya`} />
          <Kpi label="Tingkat konversi" value={conversionPct} suffix="%" note="pengunjung yang meninggalkan data" />
        </div>
      ) : null}

      {/* ── the work waiting, and anything asking for attention ── */}
      {summary || attention.length ? (
        <div
          className={cn(
            'mt-3 grid gap-3 [&>*]:min-w-0',
            summary && attention.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.7fr)]' : summary ? 'sm:grid-cols-2' : '',
          )}
        >
          {summary ? (
            <>
              <QueueCard
                label="Masuk hari ini"
                value={summary.today}
                note="sejak pagi"
                href="/leads"
                tone="plain"
                icon={<ArrowUpRight className="size-5" />}
              />
              <QueueCard
                label="Belum dihubungi"
                value={summary.byStatus.baru ?? 0}
                note={untouched > 0 ? `${id(untouched)} lewat 24 jam` : 'semua masih segar'}
                href="/leads?status=baru"
                tone={(summary.byStatus.baru ?? 0) > 0 ? 'amber' : 'plain'}
                icon={<PhoneCall className="size-5" />}
              />
            </>
          ) : null}

          {attention.length ? (
            <section className="rounded-[var(--radius-card)] border border-gold-200 bg-gold-50/60 p-4">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-gold-700">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> Perlu perhatian
              </h2>
              <ul className={cn('grid gap-1.5', !summary && attention.length > 1 && 'sm:grid-cols-2 xl:grid-cols-3')}>
                {attention.map((a) => (
                  <li key={a.key}>
                    <Link
                      href={a.href}
                      className="group/a flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[var(--radius-tile)] px-2.5 py-2 transition-colors hover:bg-white"
                    >
                      <span className="min-w-0 flex-1 basis-40 text-[13px] leading-snug text-ink-800">{a.text}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-gold-700">
                        {a.cta}
                        <ArrowRight className="size-3.5 transition-transform group-hover/a:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* ── traffic beside the funnel it feeds ── */}
      {timeseries.length || funnel.length ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] [&>*]:min-w-0">
          {timeseries.length ? (
            <Card
              title="Tren kunjungan"
              description="Arahkan kursor pada grafik untuk melihat angka satu hari."
              action={
                <div className="flex rounded-[var(--radius-input)] border border-line p-0.5" role="group" aria-label="Pilih ukuran">
                  {([['both', 'Keduanya'], ['views', 'Kunjungan'], ['visitors', 'Pengunjung']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMetric(key)}
                      aria-pressed={metric === key}
                      className={cn(
                        'rounded-[6px] px-2.5 py-1 text-[12px] font-semibold transition-colors',
                        metric === key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-paper hover:text-ink-900',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              <TrendChart points={timeseries} metric={metric} />
            </Card>
          ) : null}

          {funnel.length ? (
            <Card title="Funnel calon nasabah" description="Berapa yang lanjut dari langkah sebelumnya.">
              <Funnel steps={funnel} />
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ── where the traffic comes from, and what it reads ── */}
      {sources.length || devices.length || topPages.length ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] [&>*]:min-w-0">
          {sources.length || devices.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 [&>*]:min-w-0">
              {sources.length ? (
                <Card title="Sumber kunjungan" description="Dari mana pengunjung datang.">
                  <BarList items={sources.map((s) => ({ label: s.source, value: s.views }))} showShare max={5} />
                </Card>
              ) : null}
              {devices.length ? (
                <Card title="Perangkat" description="Tampilan mana yang harus diprioritaskan.">
                  <BarList
                    tone="gold"
                    items={devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, value: d.views, hint: `${d.pct}%` }))}
                  />
                </Card>
              ) : null}
            </div>
          ) : null}

          {topPages.length ? (
            <Card title="Halaman terpopuler" description={`${range} hari terakhir, kunjungan terbanyak lebih dulu.`}>
              {/* A table on a desk, stacked rows on a phone — the same numbers
                  either way, and no sideways scroll to reach them. */}
              <div className="-mx-1">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.04em] text-ink-400">
                      <th className="px-1 pb-2 font-semibold">Halaman</th>
                      <th className="px-1 pb-2 text-right font-semibold">Kunjungan</th>
                      <th className="hidden px-1 pb-2 text-right font-semibold sm:table-cell">Pengunjung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.slice(0, 8).map((p) => (
                      <tr key={p.path} className="border-t border-line transition-colors hover:bg-paper">
                        <td className="max-w-0 px-1 py-2">
                          <a
                            href={`${LP}${p.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono block truncate text-[12.5px] font-medium text-ink-800 hover:text-green-700 hover:underline"
                            title={p.path}
                          >
                            {p.path}
                          </a>
                        </td>
                        <td className="tnum whitespace-nowrap px-1 py-2 text-right font-semibold text-ink-900">{id(p.views)}</td>
                        <td className="tnum hidden whitespace-nowrap px-1 py-2 text-right text-ink-500 sm:table-cell">{id(p.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ── the health of what is published ── */}
      {content ? (
        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] [&>*]:min-w-0">
          <Card title="Kesehatan website" description="Rata-rata skor SEO seluruh halaman.">
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <p className={cn(
                'tnum text-[40px] font-extrabold leading-none tracking-[-0.03em]',
                seoTone === 'green' ? 'text-green-600' : seoTone === 'gold' ? 'text-gold-600' : 'text-red-600',
              )}>
                {seoScore}%
              </p>
              <ul className="grid shrink-0 gap-1 text-[12.5px] text-ink-600">
                <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-green-500" aria-hidden="true" />{content.pages.distribution.good} halaman baik</li>
                <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-gold-400" aria-hidden="true" />{content.pages.distribution.warn} perlu diperbaiki</li>
                <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-red-600" aria-hidden="true" />{content.pages.distribution.bad} bermasalah</li>
              </ul>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`Skor SEO ${seoScore} persen`}>
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', seoTone === 'green' ? 'bg-green-500' : seoTone === 'gold' ? 'bg-gold-400' : 'bg-red-600')}
                style={{ width: `${Math.min(Math.max(seoScore, 0), 100)}%` }}
              />
            </div>
          </Card>

          <Card
            title="Halaman perlu perhatian"
            description="Skor terendah lebih dulu."
            action={<SeeAll href="/halaman" />}
          >
            {content.pages.needsAttention.length ? (
              <ul className="-my-1">
                {content.pages.needsAttention.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/halaman/${p.id}`}
                      className="group/p flex items-center gap-3 rounded-[var(--radius-tile)] px-2 py-2 transition-colors hover:bg-paper"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink-900">{p.title}</span>
                        <span className="mono block truncate text-[11.5px] text-ink-400">/{p.slug === '/' ? '' : p.slug}</span>
                      </span>
                      <Pill tone={p.score >= 85 ? 'green' : p.score >= 60 ? 'amber' : 'red'}>{p.score}%</Pill>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-300 transition-transform group-hover/p:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-400">Semua halaman sudah punya skor SEO yang baik.</p>
            )}
          </Card>
        </div>
      ) : null}

      {/* ── what the CMS holds: kept in full, given the weight of a footnote ── */}
      {content ? (
        <Card title="Isi website" description="Semua yang tersimpan di konsol." className="mt-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 [&>*]:min-w-0">
            <Tally label="Halaman" value={content.pages.total} note={`${content.pages.published} terbit`} href="/halaman" />
            <Tally label="Berita" value={content.posts.total} note={`${content.posts.published} terbit`} href="/berita" />
            <Tally label="Produk" value={content.products.total} note={`${content.products.verified} terverifikasi`} href="/produk" />
            <Tally label="Kantor" value={content.branches.total} note={`${content.branches.active} aktif`} href="/kantor" />
            <Tally label="Media" value={content.media.total} note={content.media.missingAlt > 0 ? `${content.media.missingAlt} tanpa keterangan` : `${content.media.totalSizeMb} MB`} href="/media" />
            <Tally label="Lowongan" value={content.jobs.total} note={`${content.jobs.open} dibuka`} href="/lowongan" />
            <Tally label="Testimoni" value={content.testimonials.total} note={`${content.testimonials.active} tampil`} href="/testimoni" />
            <Tally label="Tanya jawab" value={content.faqs.total} note={`${content.faqs.active} tampil`} href="/tanya-jawab" />
            <Tally label="Dokumen" value={content.documents.total} href="/dokumen" />
            <Tally label="Pengguna" value={content.users.total} note={`${content.users.active} aktif`} href="/pengguna" />
          </div>
        </Card>
      ) : null}

      {/* ── who is enquiring, and about what ── */}
      {leadsInsights ? (
        <>
        <h2 className="mb-3 mt-6 text-[15px] font-bold text-ink-900">
          Wawasan calon nasabah <span className="ml-1 text-[12.5px] font-medium text-ink-400">{range} hari terakhir</span>
        </h2>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] [&>*]:min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 [&>*]:min-w-0">
            <Kpi
              label="Tingkat konversi"
              value={leadsInsights.conversionPct}
              suffix="%"
              note="calon nasabah yang selesai ditangani"
            />
            <Card className="p-4 sm:p-5">
              <p className="text-[12.5px] font-medium text-ink-500">Rata-rata waktu respons</p>
              <p className="tnum mt-1.5 text-[26px] font-extrabold leading-none tracking-[-0.02em] text-ink-900">
                {leadsInsights.avgResponseHours === null ? '—' : `${leadsInsights.avgResponseHours} jam`}
              </p>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-400">dari masuk sampai pertama kali dihubungi</p>
            </Card>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            <Card title="Sumber">
              <BarList items={leadsInsights.bySource.map((s) => ({ label: SOURCE_LABEL[s.source] ?? s.source, value: s.count }))} showShare max={5} />
            </Card>
            <Card title="Kantor cabang">
              <BarList tone="gold" items={leadsInsights.byBranch.map((b) => ({ label: b.branchName, value: b.count }))} max={5} />
            </Card>
            <Card title="Produk diminati">
              <BarList
                max={5}
                items={leadsInsights.byProduct.map((p) => ({
                  label: p.productName, value: p.count, hint: CATEGORY_LABEL[p.category] ?? p.category,
                }))}
              />
            </Card>
          </div>
        </div>
        </>
      ) : null}

      {/* ── the queue itself, and the log beside it ── */}
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
        {can('leads:read:all', 'leads:read:branch') ? (
          <Card title="Calon nasabah terbaru" action={<SeeAll href="/leads" />}>
            {recent.length ? (
              <ul className="-my-1">
                {recent.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads?lead=${lead.id}`}
                      className="flex items-center gap-3 rounded-[var(--radius-tile)] px-2 py-2.5 transition-colors hover:bg-paper"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">{lead.name}</span>
                        <span className="block truncate text-[12px] text-ink-400">
                          {[lead.productName, lead.branchName].filter(Boolean).join(' · ') || lead.phone}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-[11.5px] text-ink-400 sm:block">{fmtRelative(lead.createdAt)}</span>
                      <Pill tone={STATUS_TONE[lead.status] ?? 'grey'}>{STATUS_LABEL[lead.status] ?? lead.status}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="Belum ada calon nasabah" body="Data akan muncul begitu ada pengunjung yang mengisi formulir di website." />
            )}
          </Card>
        ) : null}

        {can('audit:read') ? (
          <Card title="Aktivitas terbaru">
            {activity.length ? (
              <ul className="grid gap-2.5">
                {activity.slice(0, 6).map((row) => (
                  <li key={row.id} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-300" />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-snug text-ink-700">
                        <span className="font-semibold text-ink-900">{row.userName ?? 'Sistem'}</span>
                        {' '}{ACTION_LABEL[row.action] ?? row.action} {ENTITY_LABEL[row.entity] ?? row.entity}
                        {row.summary ? <span className="text-ink-500"> — {row.summary}</span> : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-400" title={fmtDate(row.createdAt)}>{fmtRelative(row.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-[13px] text-ink-400">Belum ada aktivitas tercatat.</p>
            )}
          </Card>
        ) : null}
      </div>
    </>
  )
}
