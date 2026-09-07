'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Download, ArrowRight, Rows3, Columns3 } from 'lucide-react'
import Link from 'next/link'
import { ORG_TONES, orgLevelsFrom, emptyOrgLevel, type OrgLevel, type OrgColumn, type OrgMember } from '@/contracts'
import { api } from '@/lib/api'
import { Button, IconButton, inputCls, selectCls, Alert } from './ui'

/**
 * Editor for the organisation chart block.
 *
 * The generic form renderer would show this as three levels of nested
 * repeaters, which says nothing about where anything lands on the page. The
 * chart is a spatial thing, so this editor is laid out like the chart: levels
 * top to bottom, in the order a visitor reads them, each box painted in the
 * colour it will have on the page.
 *
 * Nothing about the koperasi's own hierarchy is assumed. Levels can be added,
 * reordered and removed anywhere, so a structure with four tiers or seven is
 * as easy to describe as the three it started with. A chart saved before
 * levels existed is converted for display and written out on the first change.
 *
 * It is the one block with a hand-written form. Everything it writes is still
 * the block's own props, validated by the same schema as every other block.
 */

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

/** The vertical rule between levels, so the form reads as a chart. */
const Spine = () => <span aria-hidden="true" className="mx-auto block h-5 w-px bg-line-strong" />

function ToneSelect({ value, fallback, onChange, label }: { value?: string; fallback: string; onChange: (v: string) => void; label: string }) {
  return (
    <select aria-label={label} value={value ?? fallback} onChange={(e) => onChange(e.target.value)} className={`${selectCls} !h-8 !w-auto !py-0 text-[12px]`}>
      {ORG_TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
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
  // The board the website falls back to when the block carries none, fetched
  // so a chart that has never been edited shows what the page actually draws.
  const [board, setBoard] = useState<OrgColumn[] | null>(null)
  const [boardLoaded, setBoardLoaded] = useState(false)
  useEffect(() => {
    void api.get<{ data: Record<string, unknown> }>('/settings')
      .then((r) => setBoard(list<OrgColumn>(r.data.organization)))
      .catch(() => setBoard([]))
      .finally(() => setBoardLoaded(true))
  }, [])

  const stored = list<OrgLevel>(value.levels)
  const usesLegacy = stored.length === 0
  // What the page shows right now: the stored levels, or the legacy props
  // converted. Editing either way writes levels and clears the legacy props,
  // so there is one source of truth from the first change onwards.
  const levels = useMemo(
    () => (stored.length ? stored : orgLevelsFrom(value, board ?? [])),
    [stored, value, board],
  )

  const commit = (next: OrgLevel[]) =>
    onChange({
      ...value,
      levels: next,
      // Legacy props are emptied rather than deleted: the block schema still
      // declares them, and an empty string is what "unset" looks like there.
      ...(usesLegacy ? { apex: '', audit: '', operationsLead: '', groups: [], units: [] } : {}),
    })

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const patchLevel = (i: number, patch: Partial<OrgLevel>) => commit(levels.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const boardImportable = usesLegacy && board?.length && !list<OrgColumn>(value.groups).length

  // A legacy chart's board may live in settings, and the first edit converts
  // whatever is on screen into levels. Editing before that arrives would write
  // a chart with the board missing, so the editor waits for it.
  if (usesLegacy && !boardLoaded) {
    return (
      <p className="rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-8 text-center text-[13px] text-ink-500">
        Memuat susunan bagan…
      </p>
    )
  }

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
        Bagan disusun dari tingkatan, dari atas ke bawah, persis seperti di website. Tambahkan tingkat sebanyak yang dibutuhkan — tidak terbatas pada susunan bawaan.
      </p>

      {boardImportable ? (
        <Alert tone="amber">
          <span className="block">
            Kelompok jabatan di bagan ini masih diambil dari <strong>Pengaturan → Legalitas &amp; Organisasi</strong> ({board!.map((g) => str(g.title)).filter(Boolean).join(', ')}).
            Mengubah apa pun di bawah akan menyalinnya ke blok ini supaya bisa diatur bebas di sini.
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="dark" onClick={() => commit(orgLevelsFrom(value, board ?? []))}>
              <Download className="size-3.5" /> Salin sekarang
            </Button>
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link href="/pengaturan/profil">Buka pengaturan <ArrowRight className="size-3.5" /></Link>
            </Button>
          </span>
        </Alert>
      ) : null}

      {!levels.length && boardLoaded ? (
        <p className="rounded-[var(--radius-input)] border border-dashed border-line-strong bg-paper px-4 py-6 text-center text-[13px] text-ink-500">
          Bagan masih kosong. Tambahkan tingkat pertama di bawah.
        </p>
      ) : null}

      {levels.map((level, li) => {
        const columns = list<OrgColumn>(level.columns)
        const isColumns = level.kind === 'kolom'
        const setColumns = (next: OrgColumn[]) => patchLevel(li, { columns: next })
        const patchColumn = (ci: number, patch: Partial<OrgColumn>) => setColumns(columns.map((c, j) => (j === ci ? { ...c, ...patch } : c)))

        return (
          <div key={li}>
            <section className="rounded-[var(--radius-card)] border border-line bg-white p-3.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-700">
                  {isColumns ? <Columns3 className="size-3.5 text-ink-400" /> : <Rows3 className="size-3.5 text-ink-400" />}
                  Tingkat {li + 1}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <select
                    aria-label={`Bentuk tingkat ${li + 1}`}
                    value={isColumns ? 'kolom' : 'kotak'}
                    onChange={(e) => {
                      const kind = e.target.value as 'kotak' | 'kolom'
                      patchLevel(li, kind === 'kolom'
                        ? { kind, style: level.style ?? 'kartu', columns: columns.length ? columns : [{ title: '', tone: 'netral', members: [{ name: '', role: '' }] }] }
                        : { kind })
                    }}
                    className={`${selectCls} !h-8 !w-auto !py-0 text-[12px]`}
                  >
                    <option value="kotak">Satu kotak</option>
                    <option value="kolom">Beberapa kolom</option>
                  </select>
                  {isColumns ? (
                    <select
                      aria-label={`Gaya kolom tingkat ${li + 1}`}
                      value={level.style ?? 'kartu'}
                      onChange={(e) => patchLevel(li, { style: e.target.value as 'kartu' | 'daftar' })}
                      className={`${selectCls} !h-8 !w-auto !py-0 text-[12px]`}
                    >
                      <option value="kartu">Kartu berisi nama</option>
                      <option value="daftar">Judul + daftar jabatan</option>
                    </select>
                  ) : null}
                  <RowTools i={li} count={levels.length} label={`tingkat ${li + 1}`} onMove={(to) => commit(moved(levels, li, to))} onRemove={() => commit(levels.filter((_, j) => j !== li))} />
                </span>
              </div>

              {isColumns ? (
                <>
                  <ul className="grid gap-3">
                    {columns.map((column, ci) => {
                      const members = list<OrgMember>(column.members)
                      return (
                        <li key={ci} className="grid content-start rounded-[var(--radius-card)] border border-line bg-paper/60 p-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              value={str(column.title)} placeholder="Judul kolom" maxLength={40} aria-label="Judul kolom"
                              onChange={(e) => patchColumn(ci, { title: e.target.value })}
                              className={`${inputCls} !py-2 text-center text-[12.5px] font-bold uppercase tracking-[0.06em] ${toneClass(column.tone, level.style === 'daftar' ? 'hijau' : 'netral')}`}
                            />
                            <ToneSelect value={column.tone} fallback={level.style === 'daftar' ? 'hijau' : 'netral'} onChange={(v) => patchColumn(ci, { tone: v })} label="Warna judul kolom" />
                            <RowTools i={ci} count={columns.length} label="kolom" onMove={(to) => setColumns(moved(columns, ci, to))} onRemove={() => setColumns(columns.filter((_, j) => j !== ci))} />
                          </div>

                          <ul className="mt-2 grid gap-1.5">
                            {members.map((m, mi) => (
                              <li key={mi} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5">
                                <input
                                  value={str(m.name)} placeholder="Nama atau jabatan" maxLength={80} aria-label="Nama"
                                  onChange={(e) => patchColumn(ci, { members: members.map((x, k) => (k === mi ? { ...x, name: e.target.value } : x)) })}
                                  className={`${inputCls} !py-1.5 text-[13px] font-semibold`}
                                />
                                <input
                                  value={str(m.role)} placeholder="Keterangan (opsional)" maxLength={60} aria-label="Keterangan"
                                  onChange={(e) => patchColumn(ci, { members: members.map((x, k) => (k === mi ? { ...x, role: e.target.value } : x)) })}
                                  className={`${inputCls} !py-1.5 text-[12px]`}
                                />
                                <RowTools i={mi} count={members.length} label="baris" onMove={(to) => patchColumn(ci, { members: moved(members, mi, to) })} onRemove={() => patchColumn(ci, { members: members.filter((_, k) => k !== mi) })} />
                              </li>
                            ))}
                          </ul>
                          <Button type="button" size="sm" variant="ghost" className="mt-1.5 justify-self-start" disabled={members.length >= 20} onClick={() => patchColumn(ci, { members: [...members, { name: '', role: '' }] })}>
                            <Plus className="size-3.5" /> Baris
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                  <Button type="button" size="sm" variant="secondary" className="mt-2.5" disabled={columns.length >= 8} onClick={() => setColumns([...columns, { title: '', tone: level.style === 'daftar' ? 'hijau' : 'netral', members: [{ name: '', role: '' }] }])}>
                    <Plus className="size-3.5" /> Kolom
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <input
                      value={str(level.title)} placeholder="Nama kotak" maxLength={60} aria-label={`Teks tingkat ${li + 1}`}
                      onChange={(e) => patchLevel(li, { title: e.target.value })}
                      className={`${inputCls} max-w-sm text-center font-bold uppercase tracking-[0.08em] ${toneClass(level.tone, 'gelap')}`}
                    />
                    <ToneSelect value={level.tone} fallback="gelap" onChange={(v) => patchLevel(li, { tone: v })} label={`Warna tingkat ${li + 1}`} />
                  </div>
                </>
              )}

              {/* The box that hangs off the connector below this level. */}
              {li < levels.length - 1 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="text-[12px] text-ink-500">Kotak di samping garis bawah</span>
                  <input
                    value={str(level.aside)} placeholder="mis. SPI — kosongkan bila tidak ada" maxLength={40} aria-label={`Kotak samping tingkat ${li + 1}`}
                    onChange={(e) => patchLevel(li, { aside: e.target.value })}
                    className={`${inputCls} !h-8 !w-auto !min-w-[220px] flex-1 !py-0 text-[12.5px] ${str(level.aside) ? toneClass(level.asideTone, 'emas') : ''}`}
                  />
                  {str(level.aside) ? <ToneSelect value={level.asideTone} fallback="emas" onChange={(v) => patchLevel(li, { asideTone: v })} label="Warna kotak samping" /> : null}
                </div>
              ) : null}
            </section>
            {li < levels.length - 1 ? <Spine /> : null}
          </div>
        )
      })}

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Button type="button" size="sm" variant="secondary" disabled={levels.length >= 12} onClick={() => commit([...levels, emptyOrgLevel('kotak')])}>
          <Plus className="size-3.5" /> Tingkat: satu kotak
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={levels.length >= 12} onClick={() => commit([...levels, emptyOrgLevel('kolom')])}>
          <Plus className="size-3.5" /> Tingkat: beberapa kolom
        </Button>
        {board?.length ? (
          <Button
            type="button" size="sm" variant="ghost" disabled={levels.length >= 12}
            onClick={() => commit([...levels, { kind: 'kolom', style: 'kartu', columns: board.map((g) => ({ ...g, tone: str(g.tone) || 'netral' })) }])}
          >
            <Download className="size-3.5" /> Tingkat dari Pengaturan
          </Button>
        ) : null}
      </div>
    </div>
  )
}
