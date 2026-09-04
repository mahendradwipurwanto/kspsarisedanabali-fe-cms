'use client'

import { useEffect, useState, type ComponentType } from 'react'
import {
  ChevronDown, ChevronRight, ChevronUp, GripVertical, Plus, Trash2, ImagePlus, X, Link2, Copy,
  Sparkles, Calculator, MapPin, Phone, Users, TrendingUp, Wallet, Handshake, PiggyBank, Award, Star,
  ShieldCheck, Building2, Percent, Briefcase, FileText, Mail, Clock, Compass, Leaf, Check,
} from 'lucide-react'
import { ICON_NAMES, INTERNAL_ROUTES, type FieldDef, type FieldMap } from '@/contracts'
import { api, mediaSrc } from '@/lib/api'
import { Button, IconButton, inputCls, selectCls, Field, Switch } from './ui'
import { MediaPicker } from './MediaPicker'

/**
 * Schema-driven form renderer.
 *
 * Every input here is generated from the block's `fields` definition in the
 * vendored contracts. Add a field to the schema and it appears in the console
 * with a label, hint and validation; no form code to write or keep in sync.
 */
export function BlockForm({
  fields, value, onChange, errors, dense = false,
}: {
  fields: FieldMap
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  errors?: Record<string, string>
  dense?: boolean
}) {
  return (
    <div className={`grid ${dense ? 'gap-3.5' : 'gap-5'}`}>
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

const Counter = ({ len, max }: { len: number; max: number }) => (
  <span className={`tnum text-[11.5px] ${len > max ? 'text-red-600' : len > max * 0.9 ? 'text-gold-600' : 'text-ink-400'}`}>{len}/{max}</span>
)

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
    case 'text': {
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common} counter={def.max ? <Counter len={str.length} max={def.max} /> : undefined}>
          <input value={str} maxLength={def.max} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </Field>
      )
    }

    case 'link': {
      const str = String(value ?? '')
      const known = INTERNAL_ROUTES.find((r) => r.href === str)
      return (
        <Field label={def.label} {...common} hint={known ? `→ ${known.label}` : def.help}>
          <span className="relative block">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input value={str} list="ksp-link-routes" placeholder={def.placeholder ?? '/produk atau https://…'} onChange={(e) => onChange(e.target.value)} className={`${inputCls} mono pl-8`} />
          </span>
          <datalist id="ksp-link-routes">
            {INTERNAL_ROUTES.map((r) => <option key={r.href} value={r.href}>{r.label}</option>)}
          </datalist>
        </Field>
      )
    }

    case 'icon':
      return <IconField label={def.label} {...common} value={String(value ?? '')} onChange={onChange} />

    case 'color': {
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common}>
          <span className="flex items-center gap-2">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(str) ? str : '#4e8b2c'} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-[var(--radius-input)] border border-line bg-white p-1" aria-label={`${def.label} (pilih warna)`} />
            <input value={str} placeholder="#4e8b2c" onChange={(e) => onChange(e.target.value)} className={`${inputCls} mono`} />
          </span>
        </Field>
      )
    }

    case 'textarea': {
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common} counter={def.max ? <Counter len={str.length} max={def.max} /> : undefined}>
          <textarea value={str} rows={def.rows ?? 3} maxLength={def.max} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </Field>
      )
    }

    case 'richtext': {
      const str = String(value ?? '')
      return (
        <Field label={def.label} {...common} hint={def.help ?? 'Boleh memakai <p>, <strong>, <ul>, <li>, <a>, <h2>, <h3>. Judul besar (H1) tidak tersedia agar struktur halaman tetap rapi untuk Google.'}>
          <RichTextArea value={str} onChange={(v) => onChange(v)} />
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
            className={`${inputCls} tnum`}
          />
        </Field>
      )

    case 'boolean':
      return <Switch checked={Boolean(value)} onChange={(v) => onChange(v)} label={def.label} hint={def.help} />

    case 'select':
      return (
        <Field label={def.label} {...common}>
          <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={selectCls}>
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
      return <ReferenceField def={def} value={value} onChange={onChange} error={error} />

    case 'repeater':
      return <RepeaterField name={name} def={def} value={Array.isArray(value) ? value : []} onChange={onChange} />
  }
}

/* ────────────────────────────── rich text ───────────────────────────── */

const WRAPS: { label: string; open: string; close: string; title: string }[] = [
  { label: 'P', open: '<p>', close: '</p>', title: 'Paragraf' },
  { label: 'B', open: '<strong>', close: '</strong>', title: 'Tebal' },
  { label: 'H2', open: '<h2>', close: '</h2>', title: 'Judul bagian' },
  { label: 'H3', open: '<h3>', close: '</h3>', title: 'Sub-judul' },
  { label: '• List', open: '<ul>\n  <li>', close: '</li>\n</ul>', title: 'Daftar' },
  { label: 'Link', open: '<a href="/">', close: '</a>', title: 'Tautan' },
]

/** A textarea with a wrap toolbar: enough for the koperasi's copy without shipping an editor framework. */
function RichTextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [el, setEl] = useState<HTMLTextAreaElement | null>(null)
  const wrap = (open: string, close: string) => {
    if (!el) return
    const { selectionStart: s, selectionEnd: e } = el
    const inner = value.slice(s, e) || 'teks'
    const next = value.slice(0, s) + open + inner + close + value.slice(e)
    onChange(next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + open.length, s + open.length + inner.length) })
  }
  return (
    <div className="overflow-hidden rounded-[var(--radius-input)] border border-line bg-white focus-within:border-green-600 focus-within:shadow-[0_0_0_3px_rgb(78_139_44/0.18)]">
      <div className="flex flex-wrap gap-1 border-b border-line bg-paper px-2 py-1.5">
        {WRAPS.map((w) => (
          <button key={w.label} type="button" title={w.title} onMouseDown={(e) => e.preventDefault()} onClick={() => wrap(w.open, w.close)} className="mono rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-ink-600 hover:bg-white hover:text-ink-900">
            {w.label}
          </button>
        ))}
      </div>
      <textarea ref={setEl} value={value} rows={9} onChange={(e) => onChange(e.target.value)} className="mono block w-full resize-y bg-white px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300" placeholder="<p>Tulis isi di sini…</p>" />
    </div>
  )
}

/* ─────────────────────────────── icons ──────────────────────────────── */

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  spark: Sparkles, calculator: Calculator, 'map-pin': MapPin, phone: Phone, users: Users, 'trending-up': TrendingUp,
  wallet: Wallet, handshake: Handshake, 'piggy-bank': PiggyBank, award: Award, star: Star, 'shield-check': ShieldCheck,
  building: Building2, percent: Percent, briefcase: Briefcase, 'file-text': FileText, mail: Mail, clock: Clock,
  compass: Compass, leaf: Leaf, check: Check,
}

function IconField({
  label, hint, error, required, value, onChange,
}: { label: string; hint?: string; error?: string; required?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="grid grid-cols-7 gap-1.5 rounded-[var(--radius-input)] border border-line bg-white p-2 sm:grid-cols-11">
        {ICON_NAMES.map((name) => {
          const IconCmp = ICONS[name] ?? Sparkles
          const active = value === name
          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-pressed={active}
              onClick={() => onChange(active ? '' : name)}
              className={`grid aspect-square place-items-center rounded-[6px] border transition-colors ${active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-transparent text-ink-600 hover:border-line hover:bg-paper hover:text-ink-900'}`}
            >
              <IconCmp className="size-4" />
            </button>
          )
        })}
      </div>
      {value ? <span className="mono mt-1.5 block text-[11px] text-ink-400">{value}</span> : null}
    </Field>
  )
}

/* ─────────────────────────────── image ──────────────────────────────── */

function ImageField({
  label, help, required, value, onChange, error,
}: {
  label: string; help?: string; required?: boolean; value: string; onChange: (v: string) => void; error?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Field label={label} hint={help} error={error} required={required}>
      {value ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-input)] border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(value)} alt="" className="size-16 shrink-0 rounded-[6px] bg-paper object-cover" />
          <span className="mono min-w-0 flex-1 truncate text-[11.5px] text-ink-500">{value.replace(/^https?:\/\/[^/]+\//, '').replace(/^\/api\/media\//, '')}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>Ganti</Button>
          <IconButton label="Hapus gambar" onClick={() => onChange('')} className="hover:!text-red-600"><X className="size-4" /></IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Pilih dari media atau unggah
        </button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} value={value} onSelect={(m) => { onChange(m.key); setOpen(false) }} />
    </Field>
  )
}

/* ────────────────────────────── reference ───────────────────────────── */

interface RefOption { id: string; label: string; hint?: string }
const REF_CACHE = new Map<string, Promise<RefOption[]>>()

function loadRefs(to: 'product' | 'post' | 'branch' | 'page'): Promise<RefOption[]> {
  if (!REF_CACHE.has(to)) {
    const map = {
      product: ['/products?limit=100', (r: { id: string; name: string; category?: string }) => ({ id: r.id, label: r.name, hint: r.category })],
      branch: ['/branches?limit=100', (r: { id: string; name: string; district?: string }) => ({ id: r.id, label: r.name, hint: r.district })],
      page: ['/pages?limit=100', (r: { id: string; title: string; slug: string }) => ({ id: r.id, label: r.title, hint: `/${r.slug === '/' ? '' : r.slug}` })],
      post: ['/posts?limit=100', (r: { id: string; title: string }) => ({ id: r.id, label: r.title })],
    } as const
    const [path, pick] = map[to]
    REF_CACHE.set(to, api.get<{ data: never[] }>(path).then((r) => r.data.map(pick as (x: never) => RefOption)).catch(() => []))
  }
  return REF_CACHE.get(to)!
}

const REF_LABEL = { product: 'produk', post: 'berita', branch: 'kantor', page: 'halaman' }

function ReferenceField({
  def, value, onChange, error,
}: { def: Extract<FieldDef, { kind: 'reference' }>; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const [options, setOptions] = useState<RefOption[] | null>(null)
  useEffect(() => { void loadRefs(def.to).then(setOptions) }, [def.to])

  if (def.multiple) {
    const selected = Array.isArray(value) ? (value as string[]) : []
    return (
      <Field label={def.label} hint={def.help ?? `Kosongkan untuk menampilkan semua ${REF_LABEL[def.to]}.`} error={error}>
        <div className="scroll-thin max-h-56 overflow-y-auto rounded-[var(--radius-input)] border border-line bg-white p-1.5">
          {options === null ? <p className="px-2 py-3 text-[12.5px] text-ink-400">Memuat…</p> : options.length === 0 ? <p className="px-2 py-3 text-[12.5px] text-ink-400">Belum ada {REF_LABEL[def.to]}.</p> : options.map((o) => {
            const on = selected.includes(o.id)
            return (
              <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[13px] hover:bg-paper">
                <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== o.id) : [...selected, o.id])} className="size-4 accent-[#0f1b2d]" />
                <span className="flex-1 truncate text-ink-800">{o.label}</span>
                {o.hint ? <span className="mono truncate text-[11px] text-ink-400">{o.hint}</span> : null}
              </label>
            )
          })}
        </div>
        {selected.length ? <span className="mt-1.5 block text-[11.5px] text-ink-400">{selected.length} dipilih</span> : null}
      </Field>
    )
  }

  return (
    <Field label={def.label} hint={def.help ?? 'Kosongkan untuk otomatis.'} error={error}>
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={selectCls} disabled={options === null}>
        <option value="">{options === null ? 'Memuat…' : `— otomatis —`}</option>
        {(options ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}{o.hint ? ` · ${o.hint}` : ''}</option>)}
      </select>
    </Field>
  )
}

/* ─────────────────────────────── repeater ───────────────────────────── */

function summaryOf(item: Record<string, unknown>, fields: FieldMap) {
  for (const [key, def] of Object.entries(fields)) {
    if (['text', 'textarea', 'link'].includes(def.kind) && typeof item[key] === 'string' && item[key]) return String(item[key])
  }
  return ''
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
  const atMin = def.min !== undefined && value.length <= def.min
  const [open, setOpen] = useState<Set<number>>(() => new Set(value.length <= 2 ? value.map((_, i) => i) : [0]))
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  const update = (i: number, next: Record<string, unknown>) => onChange(value.map((v, j) => (j === i ? next : v)))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return
    const copy = [...value]
    const [m] = copy.splice(from, 1)
    copy.splice(to, 0, m!)
    onChange(copy)
    setOpen(new Set([to]))
  }
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-700">
          {def.label} <span className="tnum font-normal text-ink-400">({value.length}{def.max ? ` / ${def.max}` : ''})</span>
        </span>
        <Button type="button" size="sm" variant="secondary" disabled={atMax} onClick={() => { onChange([...value, {}]); setOpen(new Set([value.length])) }}>
          <Plus className="size-3.5" /> {itemLabel}
        </Button>
      </div>
      {def.help ? <p className="mb-2 text-[12px] leading-relaxed text-ink-400">{def.help}</p> : null}

      {value.length === 0 ? (
        <p className="rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-6 text-center text-[13px] text-ink-500">
          Belum ada {itemLabel.toLowerCase()}. Klik “{itemLabel}” untuk menambah.
        </p>
      ) : (
        <ul className="grid gap-2">
          {value.map((item, i) => {
            const isOpen = open.has(i)
            const isOver = over === i && dragging !== null && dragging !== i
            const summary = summaryOf(item, def.of)
            return (
              <li
                key={i}
                draggable
                onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
                onDragOver={(e) => { e.preventDefault(); setOver(i) }}
                onDragEnd={() => { setDragging(null); setOver(null) }}
                onDrop={(e) => { e.preventDefault(); const from = dragging ?? Number(e.dataTransfer.getData('text/plain')); setDragging(null); setOver(null); if (!Number.isNaN(from)) move(from, i) }}
                className={`min-w-0 rounded-[var(--radius-card)] border bg-white transition-[opacity] ${dragging === i ? 'opacity-40' : ''} ${isOver ? 'border-gold-400' : 'border-line'}`}
              >
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden py-1.5 pl-2 pr-1.5">
                  <span aria-hidden="true" className="cursor-grab text-ink-300 active:cursor-grabbing"><GripVertical className="size-4" /></span>
                  <button type="button" onClick={() => toggle(i)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
                    {isOpen ? <ChevronDown className="size-3.5 shrink-0 text-ink-400" /> : <ChevronRight className="size-3.5 shrink-0 text-ink-400" />}
                    <span className="mono tnum text-[11px] text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate text-[13px] font-semibold text-ink-800">{summary || `${itemLabel} ${i + 1}`}</span>
                  </button>
                  <span className="flex shrink-0 items-center">
                    <span className="flex flex-col">
                      <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Naikkan" className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                      <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label="Turunkan" className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
                    </span>
                    <IconButton size="sm" label="Duplikat" disabled={atMax} onClick={() => { const copy = [...value]; copy.splice(i + 1, 0, structuredClone(item)); onChange(copy); setOpen(new Set([i + 1])) }}><Copy className="size-3.5" /></IconButton>
                    <IconButton size="sm" label="Hapus" disabled={atMin} onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
                  </span>
                </div>
                {isOpen ? (
                  <div className="border-t border-line bg-paper/60 p-3.5">
                    <BlockForm fields={def.of} value={item} onChange={(next) => update(i, next)} dense />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
