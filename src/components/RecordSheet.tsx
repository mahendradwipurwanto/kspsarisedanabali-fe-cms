'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ImagePlus, Trash2, Upload, X, FileText, Star } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet'
import { Button, IconButton, inputCls, selectCls, Field, Switch, Alert } from './ui'
import { MediaPicker } from './MediaPicker'
import { RichTextEditor } from './RichTextEditor'
import { Counter, IconGrid } from './icons'
import { toast } from 'sonner'
import { uploadDocument } from '@/lib/api'
import { mediaThumb } from '@/lib/api'
import { fieldValue, fileLabel, isNumeric, toSlug, validateFields, type TableField } from './fields'
import { cleanPhoneInput } from '@/contracts'
import { cn } from '@/lib/utils'

function ImageInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaThumb(value, 56)} alt="" className="size-14 shrink-0 rounded-[6px] bg-paper object-cover" />
          {/* The name, not the whole storage path, and wrapped over two lines
              rather than cut off — a cover image is recognised by its name. */}
          <span className="mono min-w-0 flex-1 break-all text-[11.5px] leading-snug text-ink-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" title={value}>
            {fileLabel(value)}
          </span>
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

/**
 * A score out of five, chosen rather than typed.
 *
 * It was a plain number box, which accepted 0, 9, or -3 as readily as 4 — and
 * asked the reader to translate a rating into a figure. Hovering shows what a
 * click will set; the arrow keys work for anyone not using a mouse.
 */
function StarInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<number | null>(null)
  const score = Math.max(0, Math.min(5, Math.round(value || 0)))
  const shown = preview ?? score

  return (
    <div
      role="radiogroup"
      aria-label="Penilaian bintang"
      className="flex items-center gap-1"
      onMouseLeave={() => setPreview(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={score === n}
          aria-label={`${n} bintang`}
          disabled={disabled}
          onMouseEnter={() => setPreview(n)}
          onFocus={() => setPreview(n)}
          onBlur={() => setPreview(null)}
          onClick={() => onChange(n)}
          className="rounded-[4px] p-0.5 transition-transform disabled:cursor-not-allowed hover:enabled:scale-110"
        >
          <Star className={cn('size-7 transition-colors', n <= shown ? 'fill-gold-400 text-gold-400' : 'text-ink-200')} />
        </button>
      ))}
      <span className="tnum ml-2 text-[13px] font-semibold text-ink-600">{shown} dari 5</span>
    </div>
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
          <span className="mono min-w-0 flex-1 break-all text-[12px] leading-snug text-ink-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" title={value}>
            {fileLabel(value)}
          </span>
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
  open, onOpenChange, fields, values, onChange, onSave, onDelete, title, subtitle, busy, canWrite, note,
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
  note?: ReactNode
}) {
  const editable = fields.filter((f) => f.type !== 'readonly' && !f.readOnly)
  // Phone, email and web addresses are checked here before the API sees
  // them, so the message sits under the field rather than in a toast.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Fields this sheet filled in on its own. A derived field keeps following its
  // source while it is one of these, and stops for good once someone types in
  // it — which is also why an existing record, whose slug arrived already
  // filled, is never rewritten by an edit to its title.
  const [auto, setAuto] = useState<Set<string>>(new Set())
  useEffect(() => { setAuto(new Set()); setFieldErrors({}) }, [open, values.id])

  const set = (key: string, v: unknown) => {
    const next: Record<string, unknown> = { ...values, [key]: v }
    const filled = new Set(auto)
    for (const f of fields) {
      if (f.deriveFrom !== key) continue
      const current = String(values[f.key] ?? '')
      if (current && !auto.has(f.key)) continue
      next[f.key] = toSlug(String(v ?? ''))
      filled.add(f.key)
    }
    if (filled.size !== auto.size) setAuto(filled)
    if (auto.has(key)) setAuto((prev) => { const p = new Set(prev); p.delete(key); return p })
    onChange(next)
    if (fieldErrors[key]) setFieldErrors((prev) => { const p = { ...prev }; delete p[key]; return p })
  }

  const submit = () => {
    const problems = validateFields(editable, values)
    setFieldErrors(problems)
    const first = Object.values(problems)[0]
    if (first) { toast.warning('Ada isian yang belum benar', { description: first }); return }
    onSave()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle ? <SheetDescription className="mono">{subtitle}</SheetDescription> : null}
        </SheetHeader>

        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          <div className="grid gap-4">
            {editable.map((f) => {
              const v = values[f.key]
              if (f.type === 'boolean') {
                return <Switch key={f.key} checked={Boolean(v)} onChange={(x) => set(f.key, x)} label={f.label} hint={f.hint} disabled={!canWrite} />
              }
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  required={f.required}
                  error={fieldErrors[f.key]}
                  counter={f.max ? <Counter len={String(v ?? '').length} max={f.max} /> : undefined}
                >
                  {f.type === 'longtext' ? (
                    <textarea rows={f.rows ?? 4} maxLength={f.max} value={String(v ?? '')} disabled={!canWrite} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                  ) : f.type === 'richtext' ? (
                    <RichTextEditor value={String(v ?? '')} disabled={!canWrite} onChange={(html) => set(f.key, html)} />
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
                  ) : f.type === 'slug' ? (
                    <input
                      value={String(v ?? '')}
                      maxLength={f.max}
                      disabled={!canWrite}
                      placeholder={f.placeholder ?? 'kegiatan-sosial'}
                      onChange={(e) => set(f.key, e.target.value)}
                      className={`${inputCls} mono`}
                    />
                  ) : f.type === 'icon' ? (
                    <IconGrid value={String(v ?? '')} disabled={!canWrite} onChange={(name) => set(f.key, name)} />
                  ) : f.type === 'stars' ? (
                    <StarInput value={Number(v ?? 0)} disabled={!canWrite} onChange={(n) => set(f.key, n)} />
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
                  ) : f.type === 'tel' ? (
                    <input type="tel" inputMode="numeric" maxLength={16} value={String(v ?? '')} disabled={!canWrite} placeholder={f.placeholder ?? '081234567890'} onChange={(e) => set(f.key, cleanPhoneInput(e.target.value))} className={`${inputCls} tnum`} />
                  ) : f.type === 'email' ? (
                    <input type="email" inputMode="email" value={String(v ?? '')} disabled={!canWrite} placeholder={f.placeholder ?? 'nama@email.com'} onChange={(e) => set(f.key, e.target.value.trim())} className={inputCls} />
                  ) : f.type === 'url' ? (
                    <input type="url" inputMode="url" value={String(v ?? '')} disabled={!canWrite} placeholder={f.placeholder ?? 'https://…'} onChange={(e) => set(f.key, e.target.value.trim())} className={`${inputCls} mono`} />
                  ) : (
                    <input value={String(v ?? '')} maxLength={f.max} disabled={!canWrite} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} className={`${inputCls} ${f.type === 'link' ? 'mono' : ''}`} />
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
            {canWrite ? <Button variant="dark" onClick={submit} loading={busy}>Simpan</Button> : null}
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
    // A choice with no "none" option starts on its first choice. Left blank it
    // would be sent as "", and an API default cannot rescue that: an empty
    // string is a value, so the enum rejects it rather than falling back —
    // which is what stopped a new berita from saving at all.
    if (f.type === 'select' && !f.emptyOption && f.options?.length) { out[f.key] = f.options[0]!.value; continue }
    // A number left blank must be omitted, not sent as "", which the API
    // rejects with "Expected number, received string".
    out[f.key] = f.type === 'boolean' ? false : f.type === 'list' ? [] : isNumeric(f.type) ? undefined : ''
  }
  return out
}
