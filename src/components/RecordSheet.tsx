'use client'

import { useState, type ReactNode } from 'react'
import { ImagePlus, Trash2, Upload, X, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet'
import { Button, IconButton, inputCls, selectCls, Field, Switch, Alert } from './ui'
import { MediaPicker } from './MediaPicker'
import { toast } from 'sonner'
import { uploadDocument } from '@/lib/api'
import { mediaSrc } from '@/lib/api'
import { fieldValue, isNumeric, type TableField } from './fields'

function ImageInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(value)} alt="" className="size-14 shrink-0 rounded-[6px] bg-paper object-cover" />
          <span className="mono min-w-0 flex-1 truncate text-[11.5px] text-ink-500">{value}</span>
          {!disabled ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Ganti</Button>
              <IconButton label="Hapus gambar" onClick={() => onChange('')} className="hover:!text-red-600"><X className="size-4" /></IconButton>
            </>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-4 text-[13px] font-semibold text-ink-600 hover:border-ink-900 hover:text-ink-900 disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden="true" /> Pilih dari media
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} value={value} onSelect={(m) => { onChange(m.key); setOpen(false) }} />
    </>
  )
}

/** Upload a document straight to storage and keep only its key on the record. */
function FileInput({ value, onChange, disabled }: { value: string; onChange: (v: string, size?: number) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)

  async function pick(file: File) {
    setBusy(true)
    try {
      const res = await uploadDocument(file)
      onChange(res.key, res.size)
      toast.success('Berkas terunggah')
    } catch (e) {
      toast.error('Gagal mengunggah berkas', { description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-line bg-white p-2.5">
          <FileText className="size-5 shrink-0 text-ink-400" />
          <span className="mono min-w-0 flex-1 truncate text-[12px] text-ink-600">{value}</span>
          {!disabled ? <IconButton label="Hapus berkas" onClick={() => onChange('')} className="hover:!text-red-600"><X className="size-4" /></IconButton> : null}
        </div>
      ) : null}
      {!disabled ? (
        <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-3.5 text-[13px] font-semibold text-ink-600 hover:border-ink-900 hover:text-ink-900 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload className="size-4" aria-hidden="true" />
          {busy ? 'Mengunggah…' : value ? 'Ganti berkas' : 'Unggah berkas (PDF, DOC)'}
          <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f) }} />
        </label>
      ) : null}
    </div>
  )
}

/**
 * The record behind one row, in a shadcn sheet.
 *
 * The table shows and sorts; everything is changed here, including what a cell
 * cannot hold: long descriptions, list fields, images. One field list drives
 * both, so the table and the form cannot drift apart.
 */
export function RecordSheet<T extends { id: string }>({
  open, onOpenChange, fields, values, onChange, onSave, onDelete, title, subtitle, busy, canWrite, error, note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: TableField<T>[]
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  onSave: () => void
  onDelete?: () => void
  title: string
  subtitle?: string
  busy?: boolean
  canWrite?: boolean
  error?: string
  note?: ReactNode
}) {
  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v })
  const editable = fields.filter((f) => f.type !== 'readonly' && !f.readOnly)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle ? <SheetDescription className="mono">{subtitle}</SheetDescription> : null}
        </SheetHeader>

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
                    <ImageInput value={String(v ?? '')} onChange={(x) => set(f.key, x)} disabled={!canWrite} />
                  ) : f.type === 'file' ? (
                    <FileInput
                      value={String(v ?? '')}
                      disabled={!canWrite}
                      onChange={(x, size) => onChange({ ...values, [f.key]: x, ...(size ? { fileSize: size } : {}) })}
                    />
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
          {note ? <div className="mt-5 border-t border-line pt-4">{note}</div> : null}
        </div>

        <SheetFooter>
          {canWrite && onDelete ? (
            <Button variant="dangerGhost" size="sm" onClick={onDelete}><Trash2 className="size-3.5" /> Hapus</Button>
          ) : <span />}
          <span className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Tutup</Button>
            {canWrite ? <Button variant="dark" onClick={onSave} loading={busy}>Simpan</Button> : null}
          </span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Values for the form: the row as it stands, or the field defaults for a new record. */
export function recordValues<T extends { id: string }>(fields: TableField<T>[], row: T | null): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (row) { out[f.key] = fieldValue(row, f); continue }
    if (f.defaultValue !== undefined) { out[f.key] = f.defaultValue; continue }
    // A number left blank must be omitted, not sent as "", which the API
    // rejects with "Expected number, received string".
    out[f.key] = f.type === 'boolean' ? false : f.type === 'list' ? [] : isNumeric(f.type) ? undefined : ''
  }
  return out
}
