'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { isValidEmail, isValidPhone, isValidUrl, PHONE_ERROR, EMAIL_ERROR, URL_ERROR } from '@/contracts'
import { Check, Minus, MoreHorizontal, Pencil, Trash2, ExternalLink, FileText, Image as ImageIcon, Star } from 'lucide-react'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { SortHeader } from './DataTable'
import { ICONS } from './icons'
import { mediaThumb } from '@/lib/api'
import { cn } from '@/lib/utils'

/* ─────────────────────────────── field model ────────────────────────────── */

export type FieldType =
  | 'text' | 'longtext' | 'richtext' | 'number' | 'currency' | 'percent'
  | 'select' | 'boolean' | 'date' | 'list' | 'link' | 'image' | 'file' | 'readonly'
  | 'tel' | 'email' | 'url' | 'stars' | 'icon' | 'slug'

/**
 * What a record form checks before it lets a save through. Phone, email and
 * web addresses follow the same rules the website's forms and the API use, so
 * a number staff type is one the site can dial.
 */
export function validateFields(fields: { key: string; label: string; type: FieldType; required?: boolean; max?: number }[], values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const v = values[f.key]
    const text = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
    if (f.required && (text === '' || (Array.isArray(v) && v.length === 0))) { out[f.key] = 'Wajib diisi'; continue }
    if (!text) continue
    if (f.max && text.length > f.max) { out[f.key] = `Maksimal ${f.max} karakter`; continue }
    if (f.type === 'slug' && !SLUG_RULE.test(text)) out[f.key] = SLUG_ERROR
    if (f.type === 'stars' && !(Number(v) >= 1 && Number(v) <= 5)) out[f.key] = 'Pilih 1 sampai 5 bintang'
    if (f.type === 'tel' && !isValidPhone(text)) out[f.key] = PHONE_ERROR
    if (f.type === 'email' && !isValidEmail(text)) out[f.key] = EMAIL_ERROR
    if (f.type === 'url' && !isValidUrl(text)) out[f.key] = URL_ERROR
  }
  return out
}

export interface FieldOption {
  value: string
  label: string
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
  /**
   * Shown, and shown as a badge on rows that already hold it, but not
   * selectable — for a choice the API reserves to a permission this reader
   * does not have. Removing the option outright would leave an existing row
   * with nothing to render.
   */
  disabled?: boolean
  /** Why it cannot be chosen, as a tooltip on the option. */
  disabledReason?: string
}

export interface TableField<T = Record<string, unknown>> {
  key: string
  label: string
  type: FieldType
  width?: number
  options?: FieldOption[]
  /**
   * Load the select's options from a collection instead of listing them here,
   * for a field that points at another record: `/post-categories` fills the
   * category picker on Berita, so a category added on its own screen is offered
   * straight away rather than after a code change.
   */
  optionsEndpoint?: string
  /** Prepended to the loaded options, for "no category" and the like. */
  emptyOption?: FieldOption
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
  /** A number that is not a quantity — a year — so it keeps no thousands separator. */
  plain?: boolean
  /**
   * The longest the API will accept. Enforced here so the limit is visible
   * while typing rather than arriving as an English error after a failed save.
   */
  max?: number
  /** Hidden by default; the reader can switch it on from the Kolom menu. */
  hiddenByDefault?: boolean
  /** Starting value for a new record, matching what the API defaults to. */
  defaultValue?: unknown
  /**
   * Fill this field from another as it is typed, until someone edits it by
   * hand. Used for slugs, which nobody should have to write twice.
   */
  deriveFrom?: string
}

/**
 * The readable half of a stored key.
 *
 * Uploads are saved as `media/2026/09/<ulid>-nama-berkas.jpg`; the folder and
 * the ULID are plumbing, and showing them left no room for the part a person
 * recognises.
 */
export const fileLabel = (key: string) =>
  (key.split('/').pop() ?? key).replace(/^[0-9A-HJKMNP-TV-Z]{26}-/i, '')

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
    case 'number': return f.plain ? String(v) : idr.format(Number(v))
    case 'stars': return `${Math.max(0, Math.min(5, Math.round(Number(v) || 0)))} dari 5`
    case 'date': return dateFmt.format(new Date(String(v)))
    case 'list': return Array.isArray(v) ? (v as string[]).join(' · ') : String(v)
    // Rich text is stored as HTML; the reader searches the words, not the tags.
    case 'richtext': return String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    default: return String(v)
  }
}

/**
 * What a slug may be: lower case words joined by single hyphens, nothing else.
 * The same rule the API applies, checked here so a space or a capital is caught
 * while it is typed rather than refused in English after a failed save.
 */
export const SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_ERROR = 'Gunakan huruf kecil, angka, dan tanda hubung (-) saja. Contoh: kegiatan-sosial'

/** The address form of a name: lower case, words joined by hyphens. */
export const toSlug = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

/** A star score is a number, but never written with a thousands separator. */
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
      <img src={mediaThumb(src, 36)} alt="" className="size-9 rounded-[6px] border border-line object-cover" loading="lazy" />
    ) : (
      <span className="grid size-9 place-items-center rounded-[6px] border border-dashed border-line-strong text-ink-300"><ImageIcon className="size-4" /></span>
    )
  }

  if (field.type === 'file') {
    const key = String(v ?? '')
    if (!key) return <span className="text-ink-300">—</span>
    // `flex` with `min-w-0`, not `inline-flex`: an inline row sizes to its
    // content, so a long document name grew past its column and sat over the
    // actions button at the end of the row.
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-ink-700" title={fileLabel(key)}>
        <FileText className="size-3.5 shrink-0 text-ink-400" />
        <span className="min-w-0 truncate">{fileLabel(key)}</span>
      </span>
    )
  }

  if (field.type === 'icon') {
    const name = String(v ?? '')
    if (!name) return <span className="text-ink-300">—</span>
    const Glyph = ICONS[name]
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-700" title={name}>
        {Glyph ? <Glyph className="size-4 shrink-0 text-ink-500" /> : null}
        <span className="mono truncate text-[12px]">{name}</span>
      </span>
    )
  }

  if (field.type === 'stars') {
    const score = Math.max(0, Math.min(5, Math.round(Number(v) || 0)))
    return (
      <span className="flex items-center gap-0.5" aria-label={`${score} dari 5 bintang`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn('size-3.5', i < score ? 'fill-gold-400 text-gold-400' : 'text-ink-200')} />
        ))}
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

  if (field.type === 'longtext' || field.type === 'richtext') return <span className="line-clamp-2 text-ink-600">{text}</span>
  if (field.type === 'slug') return <span className="mono block truncate text-[12.5px] text-ink-600">{text}</span>
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
  fields, onEdit, onDelete, deleteHidden, extraActions, selectable = true, editLabel = 'Ubah', canWrite,
}: {
  fields: TableField<T>[]
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  /** Rows the delete action must not be offered on, even though the reader may delete. */
  deleteHidden?: (row: T) => boolean
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
    ...(onDelete && canWrite
      ? [{ label: 'Hapus', icon: <Trash2 className="size-3.5" />, onSelect: onDelete, variant: 'destructive' as const, hidden: deleteHidden }]
      : []),
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
            <DropdownMenuContent align="end" className="w-44" onCloseAutoFocus={(e) => { if (document.querySelector('[role="dialog"]')) e.preventDefault() }}>
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
