'use client'

import { useMemo, useState } from 'react'

/* ────────────────────────────────────────────────────────────────────────
   TrendChart — a dependency-free dual-series area chart.

   Built by hand rather than pulling in a charting library: the whole
   dashboard is a handful of series over a few dozen points, which SVG paths
   handle in well under 100 lines, and it keeps the CMS bundle free of a
   library whose feature set (zoom, legends, animation engines) this never
   needs.
   ──────────────────────────────────────────────────────────────────────── */

interface Point { date: string; views: number; visitors: number }

const fmtShortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d)
}

export function TrendChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 220
  const PAD = { top: 16, right: 12, bottom: 28, left: 12 }

  const { pathViews, pathVisitors, areaViews, xy, maxV } = useMemo(() => {
    const maxV = Math.max(1, ...points.map((p) => p.views))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = points.length > 1 ? innerW / (points.length - 1) : 0
    const xAt = (i: number) => PAD.left + i * step
    const yAt = (v: number) => PAD.top + innerH - (v / maxV) * innerH

    const xy = points.map((p, i) => ({ x: xAt(i), yViews: yAt(p.views), yVisitors: yAt(p.visitors) }))
    const line = (key: 'yViews' | 'yVisitors') =>
      xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(' ')

    const area = xy.length
      ? `${line('yViews')} L ${xy[xy.length - 1]!.x.toFixed(1)} ${PAD.top + innerH} L ${xy[0]!.x.toFixed(1)} ${PAD.top + innerH} Z`
      : ''

    return { pathViews: line('yViews'), pathVisitors: line('yVisitors'), areaViews: area, xy, maxV }
  }, [points])

  if (!points.length) {
    return <p className="grid h-[220px] place-items-center text-sm text-ink-400">Belum ada data pada rentang ini.</p>
  }

  const active = hover !== null ? points[hover] : null
  const activeXy = hover !== null ? xy[hover] : null

  // Thin every label out so labels never overlap regardless of range length.
  const labelEvery = Math.max(1, Math.ceil(points.length / 7))

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label="Grafik kunjungan dan pengunjung"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = ((e.clientX - rect.left) / rect.width) * W
          const step = points.length > 1 ? (W - PAD.left - PAD.right) / (points.length - 1) : 1
          const i = Math.round((relX - PAD.left) / step)
          setHover(Math.min(Math.max(i, 0), points.length - 1))
        }}
      >
        <defs>
          <linearGradient id="dashAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Four horizontal guides, unlabelled — the shape of the trend matters
            here far more than reading an exact axis value off it. */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left} x2={W - PAD.right}
            y1={PAD.top + (H - PAD.top - PAD.bottom) * f} y2={PAD.top + (H - PAD.top - PAD.bottom) * f}
            stroke="var(--color-ink-100)" strokeWidth={1}
          />
        ))}

        <path d={areaViews} fill="url(#dashAreaFill)" />
        <path d={pathViews} fill="none" stroke="var(--color-brand-600)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathVisitors} fill="none" stroke="var(--color-gold-500)" strokeWidth={2} strokeDasharray="3 3" strokeLinejoin="round" strokeLinecap="round" />

        {activeXy ? (
          <>
            <line x1={activeXy.x} x2={activeXy.x} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-ink-300)" strokeWidth={1} strokeDasharray="2 2" />
            <circle cx={activeXy.x} cy={activeXy.yViews} r={3.5} fill="var(--color-brand-600)" />
            <circle cx={activeXy.x} cy={activeXy.yVisitors} r={3.5} fill="var(--color-gold-500)" />
          </>
        ) : null}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.date} x={xy[i]!.x} y={H - 8} textAnchor="middle" className="fill-ink-400" fontSize={10}>
              {fmtShortDate(p.date)}
            </text>
          ) : null,
        )}
      </svg>

      <div className="mt-1 flex items-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-brand-600" /> Kunjungan halaman</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-gold-500" style={{ borderTop: '2px dashed var(--color-gold-500)', height: 0 }} /> Pengunjung unik</span>
        {active ? (
          <span className="tnum ml-auto rounded-md bg-ink-50 px-2 py-1 font-semibold text-ink-800">
            {fmtShortDate(active.date)} · {active.views.toLocaleString('id-ID')} kunjungan · {active.visitors.toLocaleString('id-ID')} pengunjung
          </span>
        ) : (
          <span className="ml-auto text-ink-400">Puncak: {maxV.toLocaleString('id-ID')} kunjungan/hari</span>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   BarList — the horizontal ranked list used for sources, devices, and the
   leads breakdowns. One component, four call sites, so the "which bar is
   biggest" affordance reads the same everywhere in the dashboard.
   ──────────────────────────────────────────────────────────────────────── */

export function BarList({
  items, tone = 'brand', valueFmt,
}: {
  items: { label: string; value: number; hint?: string }[]
  tone?: 'brand' | 'gold'
  valueFmt?: (v: number) => string
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-400">Belum ada data.</p>
  const max = Math.max(...items.map((i) => i.value), 1)
  const bar = tone === 'gold' ? 'bg-gold-500' : 'bg-brand-500'
  const fmt = valueFmt ?? ((v: number) => v.toLocaleString('id-ID'))

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink-700">{item.label}</span>
            <span className="tnum shrink-0 text-ink-500">
              <strong className="text-ink-900">{fmt(item.value)}</strong>
              {item.hint ? <span className="ml-1.5 text-xs text-ink-400">{item.hint}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
