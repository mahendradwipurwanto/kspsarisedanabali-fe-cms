'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Empty, fmtRelative } from '@/components/ui'

interface Overview {
  views: { value: number; changePct: number }
  visitors: { value: number; changePct: number }
  leads: { value: number; changePct: number }
}
interface FunnelStep { key: string; label: string; value: number; conversionPct: number }
interface LeadSummary { byStatus: Record<string, number>; untouchedOver24h: number; today: number }
interface LeadRow { id: string; name: string; phone: string; status: string; productName?: string | null; branchName?: string | null; createdAt: string }

const STATUS_TONE: Record<string, 'green' | 'amber' | 'grey' | 'red'> = {
  baru: 'green', diproses: 'amber', selesai: 'grey', ditolak: 'red',
}
const STATUS_LABEL: Record<string, string> = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak' }

export default function DashboardHome() {
  const { user, can } = useAuth()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [summary, setSummary] = useState<LeadSummary | null>(null)
  const [recent, setRecent] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const jobs: Promise<unknown>[] = []
      if (can('analytics:read')) {
        jobs.push(
          api.get<{ data: Overview }>('/analytics/overview?days=30').then((r) => setOverview(r.data)).catch(() => {}),
          api.get<{ data: { steps: FunnelStep[] } }>('/analytics/funnel?days=30').then((r) => setFunnel(r.data.steps)).catch(() => {}),
        )
      }
      if (can('leads:read:all', 'leads:read:branch')) {
        jobs.push(
          api.get<{ data: LeadSummary }>('/leads/summary').then((r) => setSummary(r.data)).catch(() => {}),
          api.get<{ data: LeadRow[] }>('/leads?limit=6').then((r) => setRecent(r.data)).catch(() => {}),
        )
      }
      await Promise.all(jobs)
      setLoading(false)
    })()
  }, [can])

  if (loading) return <Spinner />

  const trend = (pct: number) => (
    <span className={`text-xs font-semibold ${pct > 0 ? 'text-brand-600' : pct < 0 ? 'text-[#c4443a]' : 'text-ink-400'}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '—'} {Math.abs(pct)}%
    </span>
  )

  return (
    <>
      <PageHeader title={`Selamat datang, ${user?.name?.split(' ')[0] ?? ''}`} subtitle="Ringkasan 30 hari terakhir." />

      {/* The number that matters most: leads sitting untouched past a day. */}
      {summary && summary.untouchedOver24h > 0 ? (
        <Link href="/leads?status=baru" className="mb-6 block rounded-xl bg-[#fdf1f0] p-4 ring-1 ring-inset ring-[#f0c8c4] hover:bg-[#fbe7e5]">
          <p className="font-semibold text-[#a3352c]">
            {summary.untouchedOver24h} calon nasabah belum dihubungi lebih dari 24 jam
          </p>
          <p className="mt-0.5 text-sm text-[#a3352c]/80">Klik untuk melihat dan menindaklanjuti sekarang.</p>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          overview && { label: 'Pengunjung', value: overview.visitors.value, pct: overview.visitors.changePct, note: 'orang unik, 30 hari' },
          overview && { label: 'Halaman dibuka', value: overview.views.value, pct: overview.views.changePct, note: 'total kunjungan halaman' },
          summary && { label: 'Calon nasabah hari ini', value: summary.today, pct: null, note: 'masuk sejak pagi' },
          summary && { label: 'Belum dihubungi', value: summary.byStatus.baru ?? 0, pct: null, note: 'berstatus "Baru"' },
        ]
          .filter(Boolean)
          .map((card) => {
            const c = card as { label: string; value: number; pct: number | null; note: string }
            return (
              <Card key={c.label} className="p-5">
                <p className="text-sm font-medium text-ink-500">{c.label}</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="tnum text-2xl font-bold tracking-tight text-ink-900">{c.value.toLocaleString('id-ID')}</span>
                  {c.pct !== null ? trend(c.pct) : null}
                </div>
                <p className="mt-1 text-xs text-ink-400">{c.note}</p>
              </Card>
            )
          })}
      </div>

      {funnel.length ? (
        <Card className="mt-6 p-5 sm:p-6">
          <h2 className="font-bold text-ink-900">Perjalanan pengunjung menjadi calon nasabah</h2>
          <p className="mt-1 text-sm text-ink-500">
            Angka di kanan menunjukkan berapa persen yang lanjut dari langkah sebelumnya.
          </p>
          <ul className="mt-5 space-y-2.5">
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

      {can('leads:read:all', 'leads:read:branch') ? (
        <Card className="mt-6">
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
    </>
  )
}
