'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Minus, MoreHorizontal, Pencil, Trash2, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { SortHeader } from './DataTable'
import { mediaSrc } from '@/lib/api'
import { cn } from '@/lib/utils'

/* ─────────────────────────────── field model ────────────────────────────── */

export type FieldType =
  | 'text' | 'longtext' | 'number' | 'currency' | 'percent'
  | 'select' | 'boolean' | 'date' | 'list' | 'link' | 'image' | 'file' | 'readonly'

export interface FieldOption {
  value: string
  label: string
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

export interface TableField<T = Record<string, unknown>> {
  key: string
  label: string
  type: FieldType
  width?: number
  options?: FieldOption[]
  required?: boolean
  hint?: string
  placeholder?: string
  /** Only in the record form, never a column. */
  panelOnly?: boolean
  /** A column, but never editable. */
  readOnly?: boolean
  /** Second line under the first column. */
  secondary?: (row: T) => string | null | undefined
  /** Custom cell body. */
  render?: (row: T) => ReactNode
  /** Read the value when it is not a plain property. */
  get?: (row: T) => unknown
  rows?: number
  /** Hidden by default; the reader can switch it on from the Kolom menu. */
  hiddenByDefault?: boolean
  /** Starting value for a new record, matching what the API defaults to. */
  defaultValue?: unknown
}

const idr = new Intl.NumberFormat('id-ID')
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export const fieldValue = <T,>(row: T, f: TableField<T>): unknown =>
  f.get ? f.get(row) : (row as Record<string, unknown>)[f.key]

/** Plain text for search, CSV and the collapsed cell. */
export function fieldText<T>(row: T, f: TableField<T>): string {
  const v = fieldValue(row, f)
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

export const isNumeric = (t: FieldType) => t === 'number' || t === 'currency' || t === 'percent'

/* ────────────────────────────── cell bodies ─────────────────────────────── */

function Cell<T>({ row, field, primary }: { row: T; field: TableField<T>; primary?: boolean }) {
  if (field.render) return <>{field.render(row)}</>
  const v = fieldValue(row, field)

  if (field.type === 'boolean') {
    return v
      ? <Check className="size-4 text-green-600" aria-label="Ya" />
      : <Minus className="size-4 text-ink-300" aria-label="Tidak" />
  }

  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === String(v ?? ''))
    return opt ? <Badge variant={opt.variant ?? 'secondary'}>{opt.label}</Badge> : <span className="text-ink-300">—</span>
  }

  if (field.type === 'image') {
    const src = String(v ?? '')
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={mediaSrc(src)} alt="" className="size-9 rounded-[6px] border border-line object-cover" loading="lazy" />
    ) : (
      <span className="grid size-9 place-items-center rounded-[6px] border border-dashed border-line-strong text-ink-300"><ImageIcon className="size-4" /></span>
    )
  }

  if (field.type === 'file') {
    const key = String(v ?? '')
    if (!key) return <span className="text-ink-300">—</span>
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-700">
        <FileText className="size-3.5 shrink-0 text-ink-400" />
        <span className="truncate">{key.split('/').pop()}</span>
      </span>
    )
  }

  if (field.type === 'list') {
    const arr = Array.isArray(v) ? (v as string[]) : []
    return arr.length ? <span className="tnum text-ink-500">{arr.length} item</span> : <span className="text-ink-300">—</span>
  }

  const text = fieldText(row, field)
  if (!text) return <span className="text-ink-300">—</span>

  const secondary = field.secondary?.(row)
  if (primary) {
    return (
      <span className="block min-w-0">
        <span className="block truncate font-semibold text-ink-900">{text}</span>
        {secondary ? <span className="mt-0.5 block truncate text-[12px] text-ink-400">{secondary}</span> : null}
      </span>
    )
  }

  if (field.type === 'longtext') return <span className="line-clamp-2 text-ink-600">{text}</span>
  if (field.type === 'link') return <span className="mono block truncate text-[12.5px] text-ink-600">{text}</span>
  return <span className={cn('block truncate', isNumeric(field.type) && 'tnum whitespace-nowrap tabular-nums')}>{text}</span>
}

/* ──────────────────────────── column definitions ────────────────────────── */

export interface RowAction<T> {
  label: string
  icon?: ReactNode
  onSelect: (row: T) => void
  variant?: 'default' | 'destructive'
  hidden?: (row: T) => boolean
}

/**
 * Turn one field list into shadcn/TanStack columns: an optional selection
 * checkbox, one column per field, and a row-actions menu at the end.
 */
export function buildColumns<T extends { id: string }>({
  fields, onEdit, onDelete, extraActions, selectable = true, editLabel = 'Ubah', canWrite,
}: {
  fields: TableField<T>[]
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  extraActions?: RowAction<T>[]
  selectable?: boolean
  editLabel?: string
  canWrite?: boolean
}): ColumnDef<T, unknown>[] {
  const columns: ColumnDef<T, unknown>[] = []
  const visible = fields.filter((f) => !f.panelOnly)

  if (selectable && canWrite) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
          aria-label="Pilih semua baris"
        />
      ),
      cell: ({ row }) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(Boolean(v))} aria-label="Pilih baris" />
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    })
  }

  visible.forEach((f, i) => {
    const primary = i === 0
    columns.push({
      id: f.key,
      accessorFn: (row) => fieldValue(row, f),
      meta: { label: f.label },
      enableHiding: !primary,
      size: f.width,
      header: ({ column }) => <SortHeader column={column} align={isNumeric(f.type) ? 'right' : 'left'}>{f.label}</SortHeader>,
      cell: ({ row }) => (
        <div
          className={cn('min-w-0', isNumeric(f.type) && 'text-right')}
          style={{ maxWidth: f.width ?? (primary ? 280 : 240) }}
        >
          <Cell row={row.original} field={f} primary={primary} />
        </div>
      ),
      sortingFn: isNumeric(f.type) || f.type === 'date'
        ? 'basic'
        : (a, b) => fieldText(a.original, f).localeCompare(fieldText(b.original, f), 'id'),
    })
  })

  const actions: RowAction<T>[] = [
    ...(onEdit ? [{ label: editLabel, icon: <Pencil className="size-3.5" />, onSelect: onEdit }] : []),
    ...(extraActions ?? []),
    ...(onDelete && canWrite ? [{ label: 'Hapus', icon: <Trash2 className="size-3.5" />, onSelect: onDelete, variant: 'destructive' as const }] : []),
  ]

  if (actions.length) {
    columns.push({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      size: 56,
      header: () => <span className="sr-only">Tindakan</span>,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Tindakan untuk baris ini`}
                className="grid size-8 place-items-center rounded-[6px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 data-[state=open]:bg-ink-100"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {actions
                .filter((a) => !a.hidden?.(row.original))
                .map((a, idx) => (
                  <div key={a.label}>
                    {a.variant === 'destructive' && idx > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem variant={a.variant} onSelect={() => a.onSelect(row.original)}>
                      {a.icon}
                      {a.label}
                    </DropdownMenuItem>
                  </div>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    })
  }

  return columns
}

/** Default visibility from `hiddenByDefault`, applied on first load of a screen. */
export const defaultHidden = <T,>(fields: TableField<T>[]) =>
  Object.fromEntries(fields.filter((f) => f.hiddenByDefault).map((f) => [f.key, false]))

export const csvFromRows = <T extends { id: string }>(rows: T[], fields: TableField<T>[]) =>
  [fields.map((f) => f.label), ...rows.map((row) => fields.map((f) => fieldText(row, f)))]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

export { ExternalLink }
