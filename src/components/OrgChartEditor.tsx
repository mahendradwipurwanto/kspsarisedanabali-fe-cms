'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ORG_TONES } from '@/contracts'
import { api } from '@/lib/api'
import { Button, IconButton, inputCls, selectCls, Alert } from './ui'

/**
 * Editor for the organisation chart block.
 *
 * The generic form renderer would show this block as five unrelated fields and
 * two levels of nested repeaters, which says nothing about where any of it
 * lands on the page. The chart is a spatial thing, so this editor is laid out
 * like the chart: top box, the board, the internal auditor, the operational
 * lead, then the units — each tier edited in place, in the order a visitor
 * reads them.
 *
 * It is the one block with a hand-written form. Everything it writes is still
 * the block's own props, validated by the same schema as every other block.
 */

interface Member { name?: string; role?: string; [k: string]: unknown }
interface Group { title?: string; tone?: string; members?: Member[]; [k: string]: unknown }
interface Role { name?: string }
interface Unit { title?: string; tone?: string; roles?: Role[]; [k: string]: unknown }

type Props = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/**
 * Mirrors the website's palette so a box in the editor looks like the box on
 * the page. Every rule is forced: these classes are put on inputs, and the
 * shared input style also sets a background, a text colour and a placeholder
 * colour that would otherwise win depending on stylesheet order.
 */
const TONE_CLASS: Record<string, string> = {
  netral: '!border-line !bg-white !text-ink-900 placeholder:!text-ink-300',
  gelap: '!border-ink-900 !bg-ink-900 !text-white placeholder:!text-white/45',
  hijau: '!border-green-700 !bg-green-700 !text-white placeholder:!text-white/50',
  emas: '!border-gold-400 !bg-gold-50 !text-ink-800 placeholder:!text-ink-400',
}
const toneClass = (v: string | undefined, fallback: string) => TONE_CLASS[v ?? ''] ?? TONE_CLASS[fallback]!

/** Move an item within a list, ignoring moves that fall off either end. */
function moved<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items
  const copy = [...items]
  const [m] = copy.splice(from, 1)
  copy.splice(to, 0, m!)
  return copy
}

/** The vertical rule between tiers, so the form reads as a chart. */
const Spine = () => <span aria-hidden="true" className="mx-auto block h-5 w-px bg-line-strong" />

function ToneSelect({ value, fallback, onChange, label }: { value?: string; fallback: string; onChange: (v: string) => void; label: string }) {
  return (
    <select aria-label={label} value={value ?? fallback} onChange={(e) => onChange(e.target.value)} className={`${selectCls} !h-8 !w-auto !py-0 text-[12px]`}>
      {ORG_TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
  )
}

/** A single-box tier: the text as it will appear, painted in its own tone. */
function BoxTier({
  label, hint, value, tone, toneFallback, placeholder, onText, onTone,
}: {
  label: string
  hint: string
  value: string
  tone?: string
  toneFallback: string
  placeholder: string
  onText: (v: string) => void
  onTone: (v: string) => void
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-700">{label}</span>
        <ToneSelect value={tone} fallback={toneFallback} onChange={onTone} label={`Warna ${label.toLowerCase()}`} />
      </div>
      <input
        value={value}
        placeholder={placeholder}
        maxLength={40}
        onChange={(e) => onText(e.target.value)}
        aria-label={label}
        className={`${inputCls} mx-auto max-w-sm text-center font-bold uppercase tracking-[0.08em] ${toneClass(tone, toneFallback)}`}
      />
      <p className="mt-1.5 text-center text-[11.5px] text-ink-400">{hint}</p>
    </section>
  )
}

/** Up / down / delete, the same trio on every row in this editor. */
function RowTools({ i, count, onMove, onRemove, label }: { i: number; count: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <span className="flex shrink-0 items-center">
      <span className="flex flex-col">
        <button type="button" onClick={() => onMove(i - 1)} disabled={i === 0} aria-label={`Naikkan ${label}`} className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
        <button type="button" onClick={() => onMove(i + 1)} disabled={i === count - 1} aria-label={`Turunkan ${label}`} className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
      </span>
      <IconButton size="sm" label={`Hapus ${label}`} onClick={onRemove} className="hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
    </span>
  )
}

export function OrgChartEditor({ value, onChange }: { value: Props; onChange: (next: Props) => void }) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  const groups = list<Group>(value.groups)
  const units = list<Unit>(value.units)

  const setGroups = (next: Group[]) => set('groups', next)
  const patchGroup = (i: number, patch: Partial<Group>) => setGroups(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const setUnits = (next: Unit[]) => set('units', next)
  const patchUnit = (i: number, patch: Partial<Unit>) => setUnits(units.map((u, j) => (j === i ? { ...u, ...patch } : u)))

  // The board falls back to Pengaturan → Legalitas & Organisasi when this block
  // carries none, which used to leave an editor staring at an empty field while
  // the live page showed three full cards. Fetch it so the notice can say what
  // is actually on the page, and offer to bring it in here.
  const [board, setBoard] = useState<Group[] | null>(null)
  useEffect(() => {
    if (groups.length || board) return
    void api.get<{ data: Record<string, unknown> }>('/settings')
      .then((r) => setBoard(list<Group>(r.data.organization)))
      .catch(() => setBoard([]))
  }, [groups.length, board])

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-700">Label kecil di atas</span>
          <input value={str(value.eyebrow)} maxLength={40} placeholder="Tata kelola" onChange={(e) => set('eyebrow', e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-700">Judul bagian</span>
          <input value={str(value.heading)} maxLength={70} placeholder="Struktur Organisasi" onChange={(e) => set('heading', e.target.value)} className={inputCls} />
        </label>
      </div>

      <p className="rounded-[var(--radius-input)] border border-line bg-paper px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-500">
        Urutan di bawah ini sama dengan urutan di website, dari kotak teratas sampai unit kerja. Kosongkan sebuah kotak untuk menyembunyikannya dari bagan.
      </p>

      <BoxTier
        label="Kotak teratas" hint="Pemegang kekuasaan tertinggi koperasi." placeholder="Rapat Anggota"
        value={str(value.apex)} tone={str(value.apexTone) || undefined} toneFallback="gelap"
        onText={(v) => set('apex', v)} onTone={(v) => set('apexTone', v)}
      />

      <Spine />

      {/* ── the board ── */}
      <section className="rounded-[var(--radius-card)] border border-line bg-white p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] font-semibold text-ink-700">Kelompok jabatan <span className="tnum font-normal text-ink-400">({groups.length}/10)</span></span>
          <Button type="button" size="sm" variant="secondary" disabled={groups.length >= 10} onClick={() => setGroups([...groups, { title: '', tone: 'netral', members: [{ name: '', role: '' }] }])}>
            <Plus className="size-3.5" /> Kelompok
          </Button>
        </div>

        {groups.length === 0 ? (
          <Alert tone="amber">
            <span className="block">
              Blok ini belum punya susunan sendiri, jadi website menampilkan susunan dari <strong>Pengaturan → Legalitas &amp; Organisasi</strong>
              {board?.length ? <> ({board.map((g) => str(g.title)).filter(Boolean).join(', ')})</> : null}.
            </span>
            <span className="mt-2 flex flex-wrap gap-2">
              {board?.length ? (
                <Button type="button" size="sm" variant="dark" onClick={() => setGroups(board.map((g) => ({ ...g, tone: str(g.tone) || 'netral' })))}>
                  <Download className="size-3.5" /> Salin ke blok ini
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="secondary" asChild>
                <Link href="/pengaturan/profil">Buka pengaturan <ArrowRight className="size-3.5" /></Link>
              </Button>
            </span>
          </Alert>
        ) : (
          <ul className="grid gap-3">
            {groups.map((g, gi) => {
              const members = list<Member>(g.members)
              return (
                <li key={gi} className="grid content-start rounded-[var(--radius-card)] border border-line bg-paper/60 p-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={str(g.title)} placeholder="Pengurus" maxLength={40} aria-label="Nama kelompok"
                      onChange={(e) => patchGroup(gi, { title: e.target.value })}
                      className={`${inputCls} !py-2 text-center text-[12.5px] font-bold uppercase tracking-[0.06em] ${toneClass(g.tone, 'netral')}`}
                    />
                    <ToneSelect value={g.tone} fallback="netral" onChange={(v) => patchGroup(gi, { tone: v })} label="Warna kartu kelompok" />
                    <RowTools i={gi} count={groups.length} label="kelompok" onMove={(to) => setGroups(moved(groups, gi, to))} onRemove={() => setGroups(groups.filter((_, j) => j !== gi))} />
                  </div>

                  <ul className="mt-2 grid gap-1.5">
                    {members.map((m, mi) => (
                      <li key={mi} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5">
                        <input value={str(m.name)} placeholder="Nama" maxLength={80} aria-label="Nama" onChange={(e) => patchGroup(gi, { members: members.map((x, k) => (k === mi ? { ...x, name: e.target.value } : x)) })} className={`${inputCls} !py-1.5 text-[13px] font-semibold`} />
                        <input value={str(m.role)} placeholder="Jabatan (opsional)" maxLength={60} aria-label="Jabatan" onChange={(e) => patchGroup(gi, { members: members.map((x, k) => (k === mi ? { ...x, role: e.target.value } : x)) })} className={`${inputCls} !py-1.5 text-[12px]`} />
                        <RowTools i={mi} count={members.length} label="orang" onMove={(to) => patchGroup(gi, { members: moved(members, mi, to) })} onRemove={() => patchGroup(gi, { members: members.filter((_, k) => k !== mi) })} />
                      </li>
                    ))}
                  </ul>
                  <Button type="button" size="sm" variant="ghost" className="mt-1.5 justify-self-start" disabled={members.length >= 20} onClick={() => patchGroup(gi, { members: [...members, { name: '', role: '' }] })}>
                    <Plus className="size-3.5" /> Orang
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Spine />

      <BoxTier
        label="Pengawas internal" hint="Muncul di samping garis, seperti pada bagan resmi." placeholder="SPI"
        value={str(value.audit)} tone={str(value.auditTone) || undefined} toneFallback="emas"
        onText={(v) => set('audit', v)} onTone={(v) => set('auditTone', v)}
      />

      <Spine />

      <BoxTier
        label="Pimpinan operasional" hint="Kotak di atas unit-unit kerja." placeholder="Kepala Cabang"
        value={str(value.operationsLead)} tone={str(value.leadTone) || undefined} toneFallback="gelap"
        onText={(v) => set('operationsLead', v)} onTone={(v) => set('leadTone', v)}
      />

      <Spine />

      {/* ── operational units ── */}
      <section className="rounded-[var(--radius-card)] border border-line bg-white p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] font-semibold text-ink-700">Unit kerja <span className="tnum font-normal text-ink-400">({units.length}/6)</span></span>
          <Button type="button" size="sm" variant="secondary" disabled={units.length >= 6} onClick={() => setUnits([...units, { title: '', tone: 'hijau', roles: [{ name: '' }] }])}>
            <Plus className="size-3.5" /> Unit
          </Button>
        </div>

        {units.length === 0 ? (
          <p className="rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-5 text-center text-[13px] text-ink-500">
            Belum ada unit kerja. Bagian bawah bagan tidak akan tampil.
          </p>
        ) : (
          <ul className="grid gap-3">
            {units.map((u, ui) => {
              const roles = list<Role>(u.roles)
              return (
                <li key={ui} className="grid content-start rounded-[var(--radius-card)] border border-line bg-paper/60 p-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={str(u.title)} placeholder="Kabag Dana" maxLength={40} aria-label="Nama unit"
                      onChange={(e) => patchUnit(ui, { title: e.target.value })}
                      className={`${inputCls} !py-2 text-center text-[12.5px] font-bold uppercase tracking-[0.06em] ${toneClass(u.tone, 'hijau')}`}
                    />
                    <ToneSelect value={u.tone} fallback="hijau" onChange={(v) => patchUnit(ui, { tone: v })} label="Warna judul unit" />
                    <RowTools i={ui} count={units.length} label="unit" onMove={(to) => setUnits(moved(units, ui, to))} onRemove={() => setUnits(units.filter((_, j) => j !== ui))} />
                  </div>

                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {roles.map((r, ri) => (
                      <li key={ri} className="flex items-center gap-1">
                        <input value={str(r.name)} placeholder="Kasir" maxLength={40} aria-label="Nama jabatan" onChange={(e) => patchUnit(ui, { roles: roles.map((x, k) => (k === ri ? { name: e.target.value } : x)) })} className={`${inputCls} !py-1.5 text-center text-[12.5px] font-semibold`} />
                        <RowTools i={ri} count={roles.length} label="jabatan" onMove={(to) => patchUnit(ui, { roles: moved(roles, ri, to) })} onRemove={() => patchUnit(ui, { roles: roles.filter((_, k) => k !== ri) })} />
                      </li>
                    ))}
                  </ul>
                  <Button type="button" size="sm" variant="ghost" className="mt-1.5 justify-self-start" disabled={roles.length >= 10} onClick={() => patchUnit(ui, { roles: [...roles, { name: '' }] })}>
                    <Plus className="size-3.5" /> Jabatan
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
