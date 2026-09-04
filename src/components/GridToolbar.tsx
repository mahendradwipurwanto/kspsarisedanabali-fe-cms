'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Search, EyeOff, Rows3, Download, Plus, X, Trash2, ChevronDown, ArrowUpDown, RotateCcw, Check, ImagePlus,
} from 'lucide-react'
import { Button, IconButton, inputCls, selectCls, Field, Switch, Alert, Pill } from './ui'
import { MediaPicker } from './MediaPicker'
import { mediaSrc } from '@/lib/api'
import { gridValue, type GridField, type GridView, type RowHeight } from './DataGrid'

/* ─────────────────────────────── menu shell ─────────────────────────────── */

function Menu({ label, icon, children, count }: { label: string; icon: ReactNode; children: ReactNode; count?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-input)] border px-2.5 text-[12.5px] font-medium transition-colors ${
          count ? 'border-green-600 bg-green-50 text-green-700' : 'border-line bg-white text-ink-600 hover:border-ink-900 hover:text-ink-900'
        }`}
      >
        {icon}
        {label}
        {count ? <span className="tnum">{count}</span> : null}
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-60 rounded-[var(--radius-card)] border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
          {children}
        </div>
      ) : null}
    </div>
  )
}

/* ──────────────────────────────── toolbar ───────────────────────────────── */

const ROW_HEIGHT_LABEL: Record<RowHeight, string> = { short: 'Rapat', medium: 'Sedang', tall: 'Longgar' }

export function GridToolbar<T extends { id: string }>({
  fields, view, query, onQuery, onCreate, onExport, canWrite, createLabel = 'Tambah', extra,
}: {
  fields: GridField<T>[]
  view: GridView
  query: string
  onQuery: (q: string) => void
  onCreate?: () => void
  onExport?: () => void
  canWrite?: boolean
  createLabel?: string
  extra?: ReactNode
}) {
  const columns = fields.filter((f) => !f.panelOnly)
  const hiddenCount = columns.filter((f) => view.hidden.has(f.key)).length
  const dirty = hiddenCount > 0 || view.sort !== null || Object.keys(view.widths).length > 0 || view.rowHeight !== 'short'

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Menu label="Sembunyikan kolom" icon={<EyeOff className="size-3.5" />} count={hiddenCount || undefined}>
        <ul className="scroll-thin max-h-72 overflow-y-auto">
          {columns.map((f) => {
            const on = !view.hidden.has(f.key)
            return (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(view.hidden)
                    if (on) next.add(f.key); else next.delete(f.key)
                    view.setHidden(next)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] text-ink-700 hover:bg-paper"
                >
                  <span className={`h-4 w-7 shrink-0 rounded-full transition-colors ${on ? 'bg-green-600' : 'bg-ink-300'} relative`}>
                    <span className={`absolute top-0.5 size-3 rounded-full bg-white transition-transform ${on ? 'left-[14px]' : 'left-0.5'}`} />
                  </span>
                  <span className="truncate">{f.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Menu>

      <Menu label="Urutkan" icon={<ArrowUpDown className="size-3.5" />} count={view.sort ? 1 : undefined}>
        <ul className="scroll-thin max-h-72 overflow-y-auto">
          {columns.map((f) => {
            const on = view.sort?.key === f.key
            return (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => view.setSort(on && view.sort!.dir === 'asc' ? { key: f.key, dir: 'desc' } : on ? null : { key: f.key, dir: 'asc' })}
                  className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] text-ink-700 hover:bg-paper"
                >
                  <span className="min-w-0 flex-1 truncate">{f.label}</span>
                  {on ? <span className="mono shrink-0 text-[11px] text-green-700">{view.sort!.dir === 'asc' ? 'A→Z' : 'Z→A'}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </Menu>

      <Menu label={ROW_HEIGHT_LABEL[view.rowHeight]} icon={<Rows3 className="size-3.5" />}>
        <ul>
          {(['short', 'medium', 'tall'] as RowHeight[]).map((h) => (
            <li key={h}>
              <button
                type="button"
                onClick={() => view.setRowHeight(h)}
                className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] text-ink-700 hover:bg-paper"
              >
                <span className="flex-1">{ROW_HEIGHT_LABEL[h]}</span>
                {view.rowHeight === h ? <Check className="size-3.5 text-green-600" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Menu>

      <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Cari di semua kolom…"
          aria-label="Cari"
          className="h-8 w-full rounded-[var(--radius-input)] border border-line bg-white pl-8 pr-2 text-[12.5px] text-ink-900 placeholder:text-ink-300 focus:border-green-600 focus:outline-none focus:shadow-[0_0_0_3px_rgb(78_139_44/0.18)]"
        />
      </label>

      {extra}

      <div className="ml-auto flex items-center gap-2">
        {dirty ? <IconButton label="Kembalikan tampilan awal" onClick={view.reset}><RotateCcw className="size-4" /></IconButton> : null}
        {onExport ? <Button size="sm" variant="secondary" onClick={onExport}><Download className="size-3.5" /> CSV</Button> : null}
        {canWrite && onCreate ? <Button size="sm" variant="dark" onClick={onCreate}><Plus className="size-3.5" /> {createLabel}</Button> : null}
      </div>
    </div>
  )
}

/* ───────────────────────────── expanded record ──────────────────────────── */

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(value)} alt="" className="size-14 shrink-0 rounded-[6px] bg-paper object-cover" />
          <span className="mono min-w-0 flex-1 truncate text-[11.5px] text-ink-500">{value}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Ganti</Button>
          <IconButton label="Hapus gambar" onClick={() => onChange('')} className="hover:!text-red-600"><X className="size-4" /></IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-4 text-[13px] font-semibold text-ink-600 hover:border-ink-900 hover:text-ink-900"
        >
          <ImagePlus className="size-4" aria-hidden="true" /> Pilih dari media
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} value={value} onSelect={(m) => { onChange(m.key); setOpen(false) }} />
    </>
  )
}

/**
 * The record behind one row, opened from the grid's expand button.
 *
 * Everything the grid cannot show inline lives here: long descriptions, list
 * fields, images. It is also the "new record" form, so there is one place where
 * a record is described rather than two that drift apart.
 */
export function RecordPanel<T extends { id: string }>({
  fields, values, onChange, onSave, onDelete, onClose, title, subtitle, busy, canWrite, error, footerNote,
}: {
  fields: GridField<T>[]
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  onSave: () => void
  onDelete?: () => void
  onClose: () => void
  title: string
  subtitle?: string
  busy?: boolean
  canWrite?: boolean
  error?: string
  footerNote?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v })
  const editable = fields.filter((f) => f.type !== 'readonly' && !f.readOnly)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col border-l border-line bg-white shadow-[var(--shadow-lift)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold text-ink-900">{title}</h2>
            {subtitle ? <p className="mono mt-0.5 truncate text-[11.5px] text-ink-400">{subtitle}</p> : null}
          </div>
          <IconButton label="Tutup" onClick={onClose}><X className="size-4" /></IconButton>
        </header>

        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}
          <div className="grid gap-4">
            {editable.map((f) => {
              const v = values[f.key]
              if (f.type === 'boolean') {
                return <Switch key={f.key} checked={Boolean(v)} onChange={(x) => set(f.key, x)} label={f.label} hint={f.hint} disabled={!canWrite} />
              }
              return (
                <Field key={f.key} label={f.label} hint={f.hint} required={f.required}>
                  {f.type === 'longtext' ? (
                    <textarea rows={f.rows ?? 4} value={String(v ?? '')} disabled={!canWrite} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                  ) : f.type === 'list' ? (
                    <textarea
                      rows={f.rows ?? 4}
                      value={Array.isArray(v) ? (v as string[]).join('\n') : String(v ?? '')}
                      disabled={!canWrite}
                      onChange={(e) => set(f.key, e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                      placeholder="Satu baris untuk satu poin"
                      className={inputCls}
                    />
                  ) : f.type === 'select' ? (
                    <select value={String(v ?? '')} disabled={!canWrite} onChange={(e) => set(f.key, e.target.value)} className={selectCls}>
                      <option value="">— pilih —</option>
                      {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'image' ? (
                    <ImageInput value={String(v ?? '')} onChange={(x) => set(f.key, x)} />
                  ) : f.type === 'number' || f.type === 'currency' || f.type === 'percent' ? (
                    <input
                      type="number"
                      value={v === undefined || v === null || v === '' ? '' : Number(v)}
                      disabled={!canWrite}
                      onChange={(e) => set(f.key, e.target.value === '' ? undefined : Number(e.target.value))}
                      className={`${inputCls} tnum`}
                    />
                  ) : f.type === 'date' ? (
                    <input type="date" value={String(v ?? '').slice(0, 10)} disabled={!canWrite} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                  ) : (
                    <input value={String(v ?? '')} disabled={!canWrite} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} className={`${inputCls} ${f.type === 'link' ? 'mono' : ''}`} />
                  )}
                </Field>
              )
            })}
          </div>
          {footerNote ? <div className="mt-5 border-t border-line pt-4">{footerNote}</div> : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-paper px-5 py-3.5">
          {canWrite && onDelete ? (
            <Button variant="dangerGhost" size="sm" onClick={onDelete}><Trash2 className="size-3.5" /> Hapus</Button>
          ) : <span />}
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
            {canWrite ? <Button variant="dark" onClick={onSave} loading={busy}>Simpan</Button> : null}
          </span>
        </footer>
      </div>
    </div>
  )
}

/** Values for the panel: current row, or the field defaults for a new record. */
export function panelValues<T extends { id: string }>(fields: GridField<T>[], row: T | null): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (row) out[f.key] = gridValue(row, f)
    else out[f.key] = f.type === 'boolean' ? false : f.type === 'list' ? [] : ''
  }
  return out
}

export { Pill }
