'use client'

import { useMemo, useState } from 'react'

/* ────────────────────────────────────────────────────────────────────────
   TrendChart — a dependency-free area chart over the traffic series.

   Built by hand rather than pulling in a charting library: the whole
   dashboard is a handful of series over a few dozen points, which SVG paths
   handle in well under 200 lines, and it keeps the CMS bundle free of a
   library whose feature set (zoom, legends, animation engines) this never
   needs.
   ──────────────────────────────────────────────────────────────────────── */

interface Point { date: string; views: number; visitors: number }

/** Which series the reader has asked for. */
export type TrendMetric = 'both' | 'views' | 'visitors'

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(`${iso}T00:00:00`))

const id = (n: number) => n.toLocaleString('id-ID')

/** A round number at or above the peak, so the axis reads 0 / 400 / 800 rather than 0 / 317 / 634. */
function niceCeiling(v: number): number {
  if (v <= 5) return 5
  const mag = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / (mag / 2)) * (mag / 2)
}

export function TrendChart({ points, metric = 'both' }: { points: Point[]; metric?: TrendMetric }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760
  const H = 240
  const PAD = { top: 14, right: 12, bottom: 26, left: 40 }

  const showViews = metric !== 'visitors'
  const showVisitors = metric !== 'views'

  const chart = useMemo(() => {
    const peak = Math.max(
      1,
      ...points.map((p) => Math.max(showViews ? p.views : 0, showVisitors ? p.visitors : 0)),
    )
    const top = niceCeiling(peak)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = points.length > 1 ? innerW / (points.length - 1) : 0
    const xAt = (i: number) => PAD.left + i * step
    const yAt = (v: number) => PAD.top + innerH - (v / top) * innerH

    const xy = points.map((p, i) => ({ x: xAt(i), yViews: yAt(p.views), yVisitors: yAt(p.visitors) }))
    const line = (key: 'yViews' | 'yVisitors') =>
      xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(' ')
    const areaFor = (key: 'yViews' | 'yVisitors') =>
      xy.length
        ? `${line(key)} L ${xy[xy.length - 1]!.x.toFixed(1)} ${PAD.top + innerH} L ${xy[0]!.x.toFixed(1)} ${PAD.top + innerH} Z`
        : ''

    return { xy, top, innerH, line, areaFor, baseline: PAD.top + innerH }
  }, [points, showViews, showVisitors])

  if (!points.length) {
    return <p className="grid h-[240px] place-items-center text-[13px] text-ink-400">Belum ada data pada rentang ini.</p>
  }

  const active = hover !== null ? points[hover] : null
  const activeXy = hover !== null ? chart.xy[hover] : null
  // Three guides, not five: the shape of the trend is the point, and a fainter
  // grid keeps the lines themselves the loudest thing in the frame.
  const guides = [0, 0.5, 1]
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))
  const total = points.reduce((s, p) => s + (showViews ? p.views : p.visitors), 0)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label="Grafik kunjungan harian"
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
          <linearGradient id="dashFillViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-green-500)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-green-500)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dashFillVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-500)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-gold-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {guides.map((f) => {
          const y = PAD.top + chart.innerH * f
          return (
            <g key={f}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" className="fill-ink-400" fontSize={10}>
                {id(Math.round(chart.top * (1 - f)))}
              </text>
            </g>
          )
        })}

        {showViews ? (
          <>
            <path d={chart.areaFor('yViews')} fill="url(#dashFillViews)" />
            <path d={chart.line('yViews')} fill="none" stroke="var(--color-green-600)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : null}
        {showVisitors ? (
          <>
            {metric === 'visitors' ? <path d={chart.areaFor('yVisitors')} fill="url(#dashFillVisitors)" /> : null}
            <path
              d={chart.line('yVisitors')}
              fill="none"
              stroke="var(--color-gold-500)"
              strokeWidth={2}
              strokeDasharray={metric === 'both' ? '3 3' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {activeXy ? (
          <>
            <line x1={activeXy.x} x2={activeXy.x} y1={PAD.top} y2={chart.baseline} stroke="var(--color-ink-300)" strokeWidth={1} strokeDasharray="2 2" />
            {showViews ? <circle cx={activeXy.x} cy={activeXy.yViews} r={3.5} fill="var(--color-green-600)" stroke="#fff" strokeWidth={1.5} /> : null}
            {showVisitors ? <circle cx={activeXy.x} cy={activeXy.yVisitors} r={3.5} fill="var(--color-gold-500)" stroke="#fff" strokeWidth={1.5} /> : null}
          </>
        ) : null}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.date} x={chart.xy[i]!.x} y={H - 7} textAnchor="middle" className="fill-ink-400" fontSize={10}>
              {shortDate(p.date)}
            </text>
          ) : null,
        )}
      </svg>

      {/* The readout sits under the frame rather than floating over it: a box
          following the cursor covers the very line it is describing. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-500">
        {showViews ? (
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded-full bg-green-600" aria-hidden="true" /> Kunjungan halaman</span>
        ) : null}
        {showVisitors ? (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-gold-500" aria-hidden="true" /> Pengunjung unik
          </span>
        ) : null}
        <span className="tnum ml-auto rounded-[6px] bg-paper px-2.5 py-1 font-semibold text-ink-800">
          {active
            ? `${longDate(active.date)} · ${showViews ? `${id(active.views)} kunjungan` : ''}${showViews && showVisitors ? ' · ' : ''}${showVisitors ? `${id(active.visitors)} pengunjung` : ''}`
            : `Total ${id(total)} ${metric === 'visitors' ? 'pengunjung' : 'kunjungan'} · puncak ${id(chart.top)}/hari`}
        </span>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   BarList — the horizontal ranked list used for sources, devices, and the
   leads breakdowns. One component, several call sites, so the "which bar is
   biggest" affordance reads the same everywhere in the dashboard.
   ──────────────────────────────────────────────────────────────────────── */

export function BarList({
  items, tone = 'green', valueFmt, showShare, max: maxRows,
}: {
  items: { label: string; value: number; hint?: string }[]
  tone?: 'green' | 'gold'
  valueFmt?: (v: number) => string
  /** Add each row's share of the total beside its value. */
  showShare?: boolean
  max?: number
}) {
  if (!items.length) return <p className="py-6 text-center text-[13px] text-ink-400">Belum ada data.</p>
  const rows = maxRows ? items.slice(0, maxRows) : items
  const peak = Math.max(...items.map((i) => i.value), 1)
  const total = items.reduce((s, i) => s + i.value, 0)
  const bar = tone === 'gold' ? 'bg-gold-400' : 'bg-green-500'
  const fmt = valueFmt ?? id

  return (
    <ul className="grid gap-2.5">
      {rows.map((item) => (
        <li key={item.label} className="group/bar min-w-0">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-medium text-ink-700">{item.label}</span>
            <span className="tnum shrink-0 text-ink-500">
              <strong className="text-ink-900">{fmt(item.value)}</strong>
              {showShare && total > 0 ? (
                <span className="ml-1.5 text-[11.5px] text-ink-400">{Math.round((item.value / total) * 100)}%</span>
              ) : null}
              {item.hint ? <span className="ml-1.5 text-[11.5px] text-ink-400">{item.hint}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${bar} transition-[width] duration-500 [transition-timing-function:var(--ease-settle)]`}
              style={{ width: `${Math.max((item.value / peak) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ────────────────────────────────────────────────────────────────────────
   Funnel — where visitors stop becoming members.
   ──────────────────────────────────────────────────────────────────────── */

export function Funnel({ steps }: { steps: { key: string; label: string; value: number; conversionPct: number }[] }) {
  if (!steps.length) return <p className="py-6 text-center text-[13px] text-ink-400">Belum ada data.</p>

  const first = steps[0]?.value || 1
  const drops = steps.map((s, i) => (i === 0 ? 0 : Math.max((steps[i - 1]!.value || 0) - s.value, 0)))
  const gains = steps.map((s, i) => (i === 0 ? 0 : Math.max(s.value - (steps[i - 1]!.value || 0), 0)))
  // The step that loses the most people is the one worth acting on, so it is
  // the only one the eye is asked to find.
  const biggest = Math.max(...drops)
  const worst = biggest > 0 ? drops.indexOf(biggest) : -1

  return (
    <ol className="grid gap-1">
      {steps.map((step, i) => {
        const isWorst = i === worst
        return (
          <li key={step.key} className="min-w-0">
            {i > 0 ? (
              <div className="flex items-center gap-2 py-1 pl-0.5 text-[11.5px]">
                <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
                {/* A step can grow: leads arrive through the contact form too,
                    not only through profiling. Saying "0 berhenti" there would
                    be true and useless. */}
                {gains[i]! > 0 ? (
                  <span className="text-ink-400">+{id(gains[i]!)} masuk dari jalur lain</span>
                ) : drops[i]! > 0 ? (
                  <span className={isWorst ? 'font-semibold text-gold-700' : 'text-ink-400'}>
                    {id(drops[i]!)} berhenti di sini{isWorst ? ' — penurunan terbesar' : ''}
                  </span>
                ) : (
                  <span className="text-ink-400">tidak ada yang berhenti</span>
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate font-medium text-ink-800">{step.label}</span>
                  <span className="tnum shrink-0 font-bold text-ink-900">{id(step.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 [transition-timing-function:var(--ease-settle)] ${isWorst ? 'bg-gold-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.max((step.value / first) * 100, 3)}%` }}
                  />
                </div>
              </div>
              <span className="tnum w-12 shrink-0 text-right text-[12px] text-ink-400">
                {i === 0 ? '100%' : `${step.conversionPct}%`}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
