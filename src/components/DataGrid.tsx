'use client'

import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import {
  Type, AlignLeft, Hash, Percent, CircleDollarSign, ChevronDown, CheckSquare, Calendar,
  List as ListIcon, Link2, Image as ImageIcon, Lock, Maximize2, Plus, Check, X,
} from 'lucide-react'
import { Pill } from './ui'

/* ─────────────────────────────── field model ────────────────────────────── */

export type GridFieldType =
  | 'text' | 'longtext' | 'number' | 'currency' | 'percent'
  | 'select' | 'boolean' | 'date' | 'list' | 'link' | 'image' | 'readonly'

export interface GridSelectOption {
  value: string
  label: string
  tone?: 'green' | 'amber' | 'gold' | 'red' | 'grey' | 'dark'
}

export interface GridField<T = Record<string, unknown>> {
  key: string
  label: string
  type: GridFieldType
  /** Starting width in pixels; the editor can drag from here. */
  width?: number
  options?: GridSelectOption[]
  required?: boolean
  hint?: string
  placeholder?: string
  /** Only in the expanded record, never a column. */
  panelOnly?: boolean
  /** A column, but not editable anywhere. */
  readOnly?: boolean
  /** Second line under the primary cell — the way Airtable shows a subtitle. */
  secondary?: (row: T) => string | null | undefined
  /** Custom cell body; falls back to a type-appropriate renderer. */
  render?: (row: T) => ReactNode
  /** Read the value when it is not a plain property. */
  get?: (row: T) => unknown
  rows?: number
}

const TYPE_ICON: Record<GridFieldType, typeof Type> = {
  text: Type, longtext: AlignLeft, number: Hash, currency: CircleDollarSign, percent: Percent,
  select: ChevronDown, boolean: CheckSquare, date: Calendar, list: ListIcon, link: Link2,
  image: ImageIcon, readonly: Lock,
}

const DEFAULT_WIDTH: Partial<Record<GridFieldType, number>> = {
  text: 200, longtext: 280, number: 120, currency: 150, percent: 110,
  select: 150, boolean: 110, date: 150, list: 130, link: 220, image: 90, readonly: 160,
}

const ROW_HEIGHTS = { short: 36, medium: 48, tall: 68 } as const
export type RowHeight = keyof typeof ROW_HEIGHTS

const GUTTER = 56

const idr = new Intl.NumberFormat('id-ID')
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const gridValue = <T,>(row: T, f: GridField<T>): unknown =>
  f.get ? f.get(row) : (row as Record<string, unknown>)[f.key]

/** Plain text for search, CSV, and the collapsed cell. */
export function gridText<T>(row: T, f: GridField<T>): string {
  const v = gridValue(row, f)
  if (v === null || v === undefined || v === '') return ''
  switch (f.type) {
    case 'select': return f.options?.find((o) => o.value === String(v))?.label ?? String(v)
    case 'boolean': return v ? 'Ya' : 'Tidak'
    case 'currency': return `Rp${idr.format(Number(v))}`
    case 'percent': return `${String(v).replace('.', ',')}%`
    case 'number': return idr.format(Number(v))
    case 'date': return dateFmt.format(new Date(String(v)))
    case 'list': return Array.isArray(v) ? (v as string[]).join(' · ') : String(v)
    default: return String(v)
  }
}

/* ──────────────────────────────── the grid ──────────────────────────────── */

export interface GridEdit { rowId: string; key: string; value: unknown }

export function DataGrid<T extends { id: string }>({
  fields, rows, rowHeight = 'short', hidden, widths, onWidths, sort, onSort,
  onEdit, onExpand, onCreate, canWrite = false, primaryHref, emptyState, loading,
}: {
  fields: GridField<T>[]
  rows: T[]
  rowHeight?: RowHeight
  hidden: Set<string>
  widths: Record<string, number>
  onWidths: (next: Record<string, number>) => void
  sort: { key: string; dir: 'asc' | 'desc' } | null
  onSort: (next: { key: string; dir: 'asc' | 'desc' } | null) => void
  /** Commit one cell. Reject to have the grid restore the previous value. */
  onEdit?: (edit: GridEdit) => Promise<void> | void
  onExpand?: (row: T) => void
  onCreate?: () => void
  canWrite?: boolean
  /** Turns the first cell into a link — used by lists that open a full editor. */
  primaryHref?: (row: T) => string
  emptyState?: ReactNode
  loading?: boolean
}) {
  const columns = useMemo(() => fields.filter((f) => !f.panelOnly && !hidden.has(f.key)), [fields, hidden])
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  /** True when editing began by typing over the cell, so the first key is kept. */
  const [seeded, setSeeded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef(new Map<string, HTMLElement>())

  const h = ROW_HEIGHTS[rowHeight]
  const widthOf = (f: GridField<T>) => widths[f.key] ?? f.width ?? DEFAULT_WIDTH[f.type] ?? 180

  // Selection must survive a row list that shrinks under it (delete, filter).
  useEffect(() => {
    if (active && (active.r >= rows.length || active.c >= columns.length)) { setActive(null); setEditing(false) }
  }, [rows.length, columns.length, active])

  useLayoutEffect(() => {
    if (!active) return
    cellRefs.current.get(`${active.r}:${active.c}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])

  const canEditField = (f: GridField<T>) => canWrite && !f.readOnly && f.type !== 'readonly' && f.type !== 'list' && f.type !== 'image'

  const startEdit = useCallback((r: number, c: number, initial?: string) => {
    const f = columns[c]
    const row = rows[r]
    if (!f || !row || !canEditField(f)) return
    if (f.type === 'boolean') { void onEdit?.({ rowId: row.id, key: f.key, value: !gridValue(row, f) }); return }
    const current = gridValue(row, f)
    setDraft(initial ?? (current === null || current === undefined ? '' : String(current)))
    setSeeded(initial !== undefined)
    setEditing(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rows, canWrite, onEdit])

  const commit = useCallback((value: unknown) => {
    if (!active) return
    const f = columns[active.c]
    const row = rows[active.r]
    setEditing(false)
    if (!f || !row) return
    const before = gridValue(row, f)
    if (value === before) return
    void onEdit?.({ rowId: row.id, key: f.key, value })
  }, [active, columns, rows, onEdit])

  const commitDraft = useCallback(() => {
    if (!active) return
    const f = columns[active.c]
    if (!f) return
    const raw = draft.trim()
    let value: unknown = raw
    if (f.type === 'number' || f.type === 'currency' || f.type === 'percent') {
      value = raw === '' ? null : Number(raw.replace(/\./g, '').replace(',', '.'))
      if (Number.isNaN(value)) return setEditing(false)
    }
    commit(value)
  }, [active, columns, draft, commit])

  function move(dr: number, dc: number) {
    setActive((a) => {
      if (!a) return { r: 0, c: 0 }
      return {
        r: Math.min(Math.max(a.r + dr, 0), rows.length - 1),
        c: Math.min(Math.max(a.c + dc, 0), columns.length - 1),
      }
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!active) return
    const f = columns[active.c]
    const row = rows[active.r]

    if (editing) {
      // Select and long text run their own key handling.
      if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
      return
    }

    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1, 0); break
      case 'ArrowUp': e.preventDefault(); move(-1, 0); break
      case 'ArrowLeft': e.preventDefault(); move(0, -1); break
      case 'ArrowRight': e.preventDefault(); move(0, 1); break
      case 'Tab': e.preventDefault(); move(0, e.shiftKey ? -1 : 1); break
      case 'Home': e.preventDefault(); setActive({ r: active.r, c: 0 }); break
      case 'End': e.preventDefault(); setActive({ r: active.r, c: columns.length - 1 }); break
      case 'Enter':
        e.preventDefault()
        if (e.shiftKey) { if (row) onExpand?.(row) } else startEdit(active.r, active.c)
        break
      case ' ':
        if (f?.type === 'boolean') { e.preventDefault(); startEdit(active.r, active.c) }
        break
      case 'Escape': e.preventDefault(); setActive(null); break
      case 'Backspace':
      case 'Delete':
        if (f && canEditField(f)) { e.preventDefault(); commit(f.type === 'boolean' ? false : '') }
        break
      default: {
        if (e.metaKey || e.ctrlKey) {
          if (e.key.toLowerCase() === 'c' && f && row) void navigator.clipboard?.writeText(gridText(row, f)).catch(() => {})
          return
        }
        // Typing over a selected cell replaces it, as in a spreadsheet.
        if (e.key.length === 1 && f && canEditField(f) && f.type !== 'boolean' && f.type !== 'select') {
          e.preventDefault()
          startEdit(active.r, active.c, e.key)
        }
      }
    }
  }

  /* ── column resize ── */
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null)
  function onResizeDown(e: React.PointerEvent, f: GridField<T>) {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { key: f.key, startX: e.clientX, startW: widthOf(f) }
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
  }
  function onResizeMove(e: React.PointerEvent) {
    const r = resizing.current
    if (!r) return
    onWidths({ ...widths, [r.key]: Math.max(72, Math.round(r.startW + (e.clientX - r.startX))) })
  }
  const endResize = () => { resizing.current = null }

  const total = columns.reduce((sum, f) => sum + widthOf(f), 0) + GUTTER

  if (!loading && !rows.length && emptyState) return <>{emptyState}</>

  return (
    <div className="surface overflow-hidden">
      <div ref={scrollRef} className="scroll-thin overflow-auto" style={{ maxHeight: 'calc(100vh - 15rem)' }}>
        <div
          role="grid"
          aria-rowcount={rows.length + 1}
          aria-colcount={columns.length}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="relative min-w-full outline-none"
          style={{ width: total }}
        >
          {/* ── header ── */}
          <div role="row" className="sticky top-0 z-20 flex border-b border-line bg-paper">
            <div className="sticky left-0 z-10 shrink-0 border-r border-line bg-paper" style={{ width: GUTTER, height: 36 }} />
            {columns.map((f, c) => {
              const Icon = TYPE_ICON[f.type]
              const sorted = sort?.key === f.key
              return (
                <div
                  key={f.key}
                  role="columnheader"
                  aria-sort={sorted ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`group/h relative flex shrink-0 items-center gap-1.5 border-r border-line px-2.5 ${c === 0 ? 'sticky z-10 bg-paper' : ''}`}
                  style={{ width: widthOf(f), height: 36, ...(c === 0 ? { left: GUTTER } : null) }}
                >
                  <Icon className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => onSort(sorted && sort!.dir === 'asc' ? { key: f.key, dir: 'desc' } : sorted && sort!.dir === 'desc' ? null : { key: f.key, dir: 'asc' })}
                    title={`Urutkan menurut ${f.label}`}
                    className="min-w-0 flex-1 truncate text-left text-[12.5px] font-semibold text-ink-700 hover:text-ink-900"
                  >
                    {f.label}
                  </button>
                  {sorted ? (
                    <ChevronDown className={`size-3.5 shrink-0 text-ink-900 transition-transform ${sort!.dir === 'desc' ? '' : 'rotate-180'}`} aria-hidden="true" />
                  ) : null}
                  <span
                    onPointerDown={(e) => onResizeDown(e, f)}
                    onPointerMove={onResizeMove}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Ubah lebar kolom ${f.label}`}
                    className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:bg-green-600 after:opacity-0 hover:after:opacity-100"
                  />
                </div>
              )
            })}
          </div>

          {/* ── rows ── */}
          {rows.map((row, r) => {
            const isActiveRow = active?.r === r
            return (
              <div role="row" key={row.id} className="group/row flex border-b border-line last:border-b-0">
                <div
                  className={`sticky left-0 z-10 flex shrink-0 items-center justify-between gap-1 border-r border-line px-2 ${isActiveRow ? 'bg-paper' : 'bg-white group-hover/row:bg-paper'}`}
                  style={{ width: GUTTER, height: h }}
                >
                  <span className="mono tnum text-[11px] text-ink-300 group-hover/row:hidden">{String(r + 1).padStart(2, '0')}</span>
                  {onExpand ? (
                    <button
                      type="button"
                      onClick={() => onExpand(row)}
                      aria-label={`Buka rekaman baris ${r + 1}`}
                      title="Buka rekaman (Shift + Enter)"
                      className="hidden size-6 place-items-center rounded-[5px] text-ink-500 hover:bg-ink-100 hover:text-ink-900 group-hover/row:grid"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {columns.map((f, c) => {
                  const isActive = isActiveRow && active?.c === c
                  const isEditing = isActive && editing
                  return (
                    <div
                      key={f.key}
                      role="gridcell"
                      ref={(el) => { if (el) cellRefs.current.set(`${r}:${c}`, el); else cellRefs.current.delete(`${r}:${c}`) }}
                      onMouseDown={() => { if (isEditing) return; setActive({ r, c }); setEditing(false) }}
                      onDoubleClick={() => startEdit(r, c)}
                      className={`relative shrink-0 border-r border-line ${c === 0 ? 'sticky z-[5]' : ''} ${
                        isActive ? 'z-10 bg-white outline outline-2 -outline-offset-1 outline-green-600' : isActiveRow ? 'bg-paper' : 'bg-white group-hover/row:bg-paper'
                      }`}
                      style={{ width: widthOf(f), height: h, ...(c === 0 ? { left: GUTTER } : null) }}
                    >
                      {isEditing ? (
                        <CellEditor
                          field={f}
                          draft={draft}
                          setDraft={setDraft}
                          seeded={seeded}
                          height={h}
                          onCommit={commitDraft}
                          onCommitValue={commit}
                          onCancel={() => setEditing(false)}
                          onCommitAndMove={(dr, dc) => { commitDraft(); move(dr, dc) }}
                        />
                      ) : (
                        <CellView row={row} field={f} primaryHref={c === 0 ? primaryHref : undefined} rowHeight={rowHeight} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* ── add row ── */}
          {canWrite && onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="sticky left-0 flex w-full items-center gap-2 px-4 text-[12.5px] font-medium text-ink-500 transition-colors hover:bg-paper hover:text-ink-900"
              style={{ height: h }}
            >
              <Plus className="size-4" aria-hidden="true" /> Tambah baris
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line bg-paper px-4 py-2 text-[11.5px] text-ink-500">
        <span className="tnum">{rows.length} baris</span>
        <span className="hidden items-center gap-3 sm:flex">
          <span>Klik sel lalu ketik untuk mengubah</span>
          <span aria-hidden="true" className="text-ink-300">·</span>
          <span>Enter untuk edit, Shift + Enter untuk buka rekaman</span>
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────── cell bodies ────────────────────────────── */

function CellView<T extends { id: string }>({
  row, field, primaryHref, rowHeight,
}: { row: T; field: GridField<T>; primaryHref?: (row: T) => string; rowHeight: RowHeight }) {
  const v = gridValue(row, field)
  const pad = 'flex h-full items-center px-2.5'

  if (field.render) return <div className={`${pad} min-w-0 overflow-hidden`}>{field.render(row)}</div>

  if (field.type === 'boolean') {
    return (
      <div className={`${pad} justify-center`}>
        <span className={`grid size-4 place-items-center rounded-[4px] border ${v ? 'border-green-600 bg-green-600 text-white' : 'border-line-strong bg-white'}`}>
          {v ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </div>
    )
  }

  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === String(v ?? ''))
    if (!opt) return <div className={pad}><span className="text-ink-300">—</span></div>
    return <div className={pad}><Pill tone={opt.tone ?? 'grey'}>{opt.label}</Pill></div>
  }

  if (field.type === 'image') {
    const src = String(v ?? '')
    return (
      <div className={`${pad} justify-center`}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-7 rounded-[4px] border border-line object-cover" />
        ) : (
          <span className="grid size-7 place-items-center rounded-[4px] border border-dashed border-line-strong text-ink-300"><ImageIcon className="size-3.5" /></span>
        )}
      </div>
    )
  }

  if (field.type === 'list') {
    const arr = Array.isArray(v) ? (v as string[]) : []
    return (
      <div className={pad}>
        {arr.length ? <span className="tnum text-[12.5px] text-ink-500">{arr.length} item</span> : <span className="text-ink-300">—</span>}
      </div>
    )
  }

  const text = gridText(row, field)
  const numeric = field.type === 'number' || field.type === 'currency' || field.type === 'percent'
  const secondary = field.secondary?.(row)
  const body = (
    <span className={`block truncate text-[13px] ${numeric ? 'tnum text-right' : ''} ${text ? 'text-ink-800' : 'text-ink-300'}`}>
      {text || '—'}
    </span>
  )

  return (
    <div className={`${pad} min-w-0 ${numeric ? 'justify-end' : ''}`}>
      <span className="min-w-0 flex-1">
        {primaryHref ? (
          <a href={primaryHref(row)} className="block truncate text-[13px] font-semibold text-ink-900 hover:text-green-700 hover:underline">
            {text || '—'}
          </a>
        ) : body}
        {secondary && rowHeight !== 'short' ? (
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-400">{secondary}</span>
        ) : null}
      </span>
    </div>
  )
}

function CellEditor<T>({
  field, draft, setDraft, seeded, height, onCommit, onCommitValue, onCancel, onCommitAndMove,
}: {
  field: GridField<T>
  draft: string
  setDraft: (v: string) => void
  /** Editing started by typing: keep that first character and put the caret after it. */
  seeded: boolean
  height: number
  onCommit: () => void
  onCommitValue: (v: unknown) => void
  onCancel: () => void
  onCommitAndMove: (dr: number, dc: number) => void
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    if (seeded) el.setSelectionRange(el.value.length, el.value.length)
    else el.select()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (field.type === 'select') {
    return (
      <div className="absolute inset-x-0 top-0 z-30 min-w-[160px] rounded-[6px] border border-green-600 bg-white shadow-[var(--shadow-lift)]">
        <ul role="listbox" className="scroll-thin max-h-56 overflow-y-auto p-1">
          {(field.options ?? []).map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onCommitValue(o.value)}
                className={`flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-paper ${o.value === draft ? 'bg-paper' : ''}`}
              >
                <Pill tone={o.tone ?? 'grey'}>{o.label}</Pill>
                {o.value === draft ? <Check className="ml-auto size-3.5 text-green-600" /> : null}
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={onCancel} className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[12px] text-ink-400 hover:bg-paper">
              <X className="size-3" /> Batal
            </button>
          </li>
        </ul>
      </div>
    )
  }

  if (field.type === 'longtext') {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
          // Enter commits; Shift + Enter is a newline, as in a spreadsheet.
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommitAndMove(1, 0) }
        }}
        className="absolute left-0 top-0 z-30 w-full min-w-[280px] resize-none rounded-[4px] border-2 border-green-600 bg-white px-2 py-1.5 text-[13px] leading-snug text-ink-900 shadow-[var(--shadow-lift)] outline-none"
        style={{ minHeight: Math.max(height, 84) }}
        rows={field.rows ?? 4}
      />
    )
  }

  const numeric = field.type === 'number' || field.type === 'currency' || field.type === 'percent'
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={draft}
      inputMode={numeric ? 'decimal' : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        if (e.key === 'Enter') { e.preventDefault(); onCommitAndMove(1, 0) }
        if (e.key === 'Tab') { e.preventDefault(); onCommitAndMove(0, e.shiftKey ? -1 : 1) }
      }}
      type={field.type === 'date' ? 'date' : 'text'}
      placeholder={field.placeholder}
      className={`absolute inset-0 z-30 w-full rounded-[2px] border-2 border-green-600 bg-white px-2 text-[13px] text-ink-900 outline-none ${numeric ? 'tnum text-right' : ''}`}
    />
  )
}

/* ───────────────────────────── view preferences ─────────────────────────── */

export interface GridView {
  hidden: Set<string>
  widths: Record<string, number>
  rowHeight: RowHeight
  sort: { key: string; dir: 'asc' | 'desc' } | null
  setHidden: (next: Set<string>) => void
  setWidths: (next: Record<string, number>) => void
  setRowHeight: (next: RowHeight) => void
  setSort: (next: { key: string; dir: 'asc' | 'desc' } | null) => void
  reset: () => void
}

/**
 * Column widths, hidden fields, row height and sort, remembered per screen in
 * localStorage so an editor's layout survives a reload.
 */
export function useGridView(viewKey: string): GridView {
  const storageKey = `ksp.grid.${viewKey}`
  const [hidden, setHiddenState] = useState<Set<string>>(new Set())
  const [widths, setWidthsState] = useState<Record<string, number>>({})
  const [rowHeight, setRowHeightState] = useState<RowHeight>('short')
  const [sort, setSortState] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  // State, not a ref: the save effect must not run until the read has been
  // applied, or its first pass writes the empty default over what was stored.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const v = JSON.parse(raw) as { hidden?: string[]; widths?: Record<string, number>; rowHeight?: RowHeight; sort?: { key: string; dir: 'asc' | 'desc' } | null }
        if (v.hidden) setHiddenState(new Set(v.hidden))
        if (v.widths) setWidthsState(v.widths)
        if (v.rowHeight) setRowHeightState(v.rowHeight)
        if (v.sort) setSortState(v.sort)
      }
    } catch { /* a blocked or full store is not worth an error */ }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ hidden: [...hidden], widths, rowHeight, sort }))
    } catch { /* ignore */ }
  }, [hydrated, storageKey, hidden, widths, rowHeight, sort])

  return {
    hidden, widths, rowHeight, sort,
    setHidden: setHiddenState, setWidths: setWidthsState, setRowHeight: setRowHeightState, setSort: setSortState,
    reset: () => { setHiddenState(new Set()); setWidthsState({}); setRowHeightState('short'); setSortState(null) },
  }
}

/** Search + sort applied to the rows the grid draws. */
export function useGridRows<T extends { id: string }>(rows: T[], fields: GridField<T>[], query: string, sort: GridView['sort']): T[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = q
      ? rows.filter((row) => fields.some((f) => gridText(row, f).toLowerCase().includes(q)))
      : rows
    if (sort) {
      const f = fields.find((x) => x.key === sort.key)
      if (f) {
        const dir = sort.dir === 'asc' ? 1 : -1
        out = [...out].sort((a, b) => {
          const av = gridValue(a, f)
          const bv = gridValue(b, f)
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
          return gridText(a, f).localeCompare(gridText(b, f), 'id') * dir
        })
      }
    }
    return out
  }, [rows, fields, query, sort])
}

export const gridCsv = <T extends { id: string }>(rows: T[], fields: GridField<T>[]) =>
  [fields.map((f) => f.label), ...rows.map((row) => fields.map((f) => gridText(row, f)))]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

export const gridStyleVars: CSSProperties = {}
