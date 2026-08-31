'use client'

import { useState } from 'react'
import type { FieldDef, FieldMap } from '@/contracts'
import { uploadFile } from '@/lib/api'
import { Button, inputCls, Field } from './ui'

/**
 * Schema-driven form renderer.
 *
 * Every input here is generated from the block's `fields` definition in
 * the vendored contracts in src/contracts. Add a field to the schema and it appears in the CMS with a
 * label, hint, and validation — no form code to write or keep in sync.
 */
export function BlockForm({
  fields, value, onChange, errors,
}: {
  fields: FieldMap
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  errors?: Record<string, string>
}) {
  return (
    <div className="grid gap-5">
      {Object.entries(fields).map(([key, def]) => (
        <FieldInput
          key={key}
          name={key}
          def={def}
          value={value[key]}
          error={errors?.[key]}
          onChange={(v) => onChange({ ...value, [key]: v })}
        />
      ))}
    </div>
  )
}

function FieldInput({
  name, def, value, onChange, error,
}: {
  name: string
  def: FieldDef
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const common = { hint: def.help, error, required: 'required' in def ? def.required : false }

  switch (def.kind) {
    case 'text':
    case 'link':
    case 'icon':
    case 'color': {
      const max = 'max' in def ? def.max : undefined
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common}>
          <input
            type={def.kind === 'color' ? 'color' : 'text'}
            value={str}
            maxLength={max}
            placeholder={'placeholder' in def ? def.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
          {max ? (
            <span className={`mt-1 block text-right text-xs tabular-nums ${str.length > max * 0.95 ? 'text-[#c4443a]' : 'text-ink-400'}`}>
              {str.length}/{max}
            </span>
          ) : null}
        </Field>
      )
    }

    case 'textarea':
    case 'richtext': {
      const max = 'max' in def ? def.max : undefined
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common}>
          <textarea
            value={str}
            rows={def.kind === 'richtext' ? 8 : ('rows' in def ? def.rows : 3) ?? 3}
            maxLength={max}
            placeholder={'placeholder' in def ? def.placeholder : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} ${def.kind === 'richtext' ? 'font-mono text-xs' : ''}`}
          />
          {def.kind === 'richtext' ? (
            <span className="mt-1 block text-xs text-ink-400">
              Boleh memakai &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, &lt;h2&gt;, &lt;h3&gt;. Judul besar (H1) tidak
              tersedia agar struktur halaman tetap rapi untuk Google.
            </span>
          ) : null}
          {max ? <span className="mt-1 block text-right text-xs tabular-nums text-ink-400">{str.length}/{max}</span> : null}
        </Field>
      )
    }

    case 'number':
      return (
        <Field label={def.label} {...common}>
          <input
            type="number"
            value={value === undefined || value === null ? '' : Number(value)}
            min={def.min}
            max={def.max}
            step={def.step ?? 1}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      )

    case 'boolean':
      return (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 p-3.5">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 size-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="block text-sm font-semibold text-ink-800">{def.label}</span>
            {def.help ? <span className="block text-xs text-ink-500">{def.help}</span> : null}
          </span>
        </label>
      )

    case 'select':
      return (
        <Field label={def.label} {...common}>
          <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            {!def.required ? <option value="">— pilih —</option> : null}
            {def.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </Field>
      )

    case 'image':
      return <ImageField label={def.label} help={def.help} required={def.required} value={String(value ?? '')} onChange={onChange} error={error} />

    case 'reference':
      return (
        <Field label={def.label} {...common}>
          <input
            value={Array.isArray(value) ? value.join(',') : String(value ?? '')}
            onChange={(e) => onChange(def.multiple ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : e.target.value)}
            placeholder={def.multiple ? 'Kosongkan untuk menampilkan semua' : 'Kosongkan untuk otomatis'}
            className={inputCls}
          />
        </Field>
      )

    case 'repeater':
      return <RepeaterField name={name} def={def} value={Array.isArray(value) ? value : []} onChange={onChange} />
  }
}

function ImageField({
  label, help, required, value, onChange, error,
}: {
  label: string; help?: string; required?: boolean; value: string; onChange: (v: string) => void; error?: string
}) {
  const [busy, setBusy] = useState(false)
  const [alt, setAlt] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function onPick(file: File) {
    // Alt text is required at upload, not optional later — that is how alt
    // coverage stays at 100% instead of decaying.
    if (!alt.trim()) return setUploadError('Isi dulu keterangan gambar (alt) sebelum mengunggah.')
    setBusy(true)
    setUploadError('')
    try {
      const res = await uploadFile(file, 'media', alt.trim())
      onChange(res.data.url)
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label={label} hint={help} error={error ?? uploadError} required={required}>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-ink-200 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-14 shrink-0 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate text-xs text-ink-500">{value}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>Ganti</Button>
        </div>
      ) : (
        <div className="grid gap-2">
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Keterangan gambar, contoh: Brosur produk Pinjaman 1 Pohon"
            className={inputCls}
          />
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f) }}
            className="w-full rounded-lg border border-dashed border-ink-300 bg-ink-50 px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
          {busy ? <span className="text-xs text-ink-500">Mengunggah…</span> : null}
        </div>
      )}
    </Field>
  )
}

function RepeaterField({
  def, value, onChange,
}: {
  name: string
  def: Extract<FieldDef, { kind: 'repeater' }>
  value: Record<string, unknown>[]
  onChange: (v: unknown) => void
}) {
  const itemLabel = def.itemLabel ?? 'Item'
  const atMax = def.max !== undefined && value.length >= def.max

  const update = (i: number, next: Record<string, unknown>) => onChange(value.map((v, j) => (j === i ? next : v)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const copy = [...value]
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
    onChange(copy)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-800">
          {def.label} <span className="font-normal text-ink-400">({value.length}{def.max ? ` / ${def.max}` : ''})</span>
        </span>
        <Button
          type="button" size="sm" variant="secondary" disabled={atMax}
          onClick={() => onChange([...value, {}])}
        >
          + Tambah {itemLabel}
        </Button>
      </div>
      {def.help ? <p className="mb-2 text-xs text-ink-500">{def.help}</p> : null}

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
          Belum ada {itemLabel.toLowerCase()}. Klik “Tambah {itemLabel}” untuk mulai.
        </p>
      ) : (
        <ul className="grid gap-3">
          {value.map((item, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-ink-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{itemLabel} {i + 1}</span>
                <span className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan">↑</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Turunkan">↓</Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    disabled={def.min !== undefined && value.length <= def.min}
                    className="text-[#c4443a] hover:bg-[#fdf1f0]"
                  >
                    Hapus
                  </Button>
                </span>
              </div>
              <BlockForm fields={def.of} value={item} onChange={(next) => update(i, next)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
