'use client'

import { useState } from 'react'
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown, CornerDownRight, Link2 } from 'lucide-react'
import type { MenuItem } from '@/contracts'
import { Button, IconButton, inputCls } from './ui'
import { LinkDatalist, linkLabel, useLinkOptions } from './link-options'

/**
 * Move up / move down.
 *
 * These were two 16px icons stacked in the corner: an easy thing to miss and a
 * hard thing to hit. A paired control the size of a normal button reads as
 * something you press, and each half keeps a hover label.
 */
function Reorder({
  onUp, onDown, upDisabled, downDisabled, compact = false,
}: { onUp: () => void; onDown: () => void; upDisabled: boolean; downDisabled: boolean; compact?: boolean }) {
  const cell = `grid ${compact ? 'size-7' : 'size-8'} place-items-center bg-white text-ink-500 transition-colors hover:bg-paper hover:text-ink-900 disabled:cursor-not-allowed disabled:text-ink-300 disabled:hover:bg-white`
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-[var(--radius-tile)] border border-line">
      <button type="button" onClick={onUp} disabled={upDisabled} aria-label="Pindah ke atas" title="Pindah ke atas" className={cell}>
        <ChevronUp className={compact ? 'size-3.5' : 'size-4'} />
      </button>
      <span aria-hidden="true" className="w-px bg-line" />
      <button type="button" onClick={onDown} disabled={downDisabled} aria-label="Pindah ke bawah" title="Pindah ke bawah" className={cell}>
        <ChevronDown className={compact ? 'size-3.5' : 'size-4'} />
      </button>
    </span>
  )
}

/**
 * Two-level menu editor. Rows are plain inputs, so a non-technical editor
 * changes a label the way they would in a spreadsheet; links autocomplete
 * from the website's fixed routes so nobody has to remember a path.
 * Reorder by dragging the handle, or with the arrows.
 */
export function MenuEditor({
  items, onChange, allowChildren = true, childLabel = 'submenu',
}: { items: MenuItem[]; onChange: (items: MenuItem[]) => void; allowChildren?: boolean; childLabel?: string }) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const options = useLinkOptions()

  const update = (i: number, next: Partial<MenuItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...next } : it)))
  const move = (list: MenuItem[], from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return list
    const copy = [...list]
    const [m] = copy.splice(from, 1)
    copy.splice(to, 0, m!)
    return copy
  }

  return (
    <div className="grid gap-2">
      <LinkDatalist id="ksp-routes" options={options} />

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-tile)] border border-dashed border-line-strong bg-paper px-4 py-6 text-center text-[13px] text-ink-500">
          Belum ada menu. Tambahkan item pertama.
        </p>
      ) : null}

      {items.map((item, i) => {
        const isOver = over === i && dragging !== null && dragging !== i
        const hasChildren = Boolean(item.children?.length)
        // A group with no address exists only to open its dropdown.
        const isGroup = hasChildren && !item.href.trim()
        return (
          <div
            key={i}
            draggable
            onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }}
            onDragOver={(e) => { e.preventDefault(); setOver(i) }}
            onDragEnd={() => { setDragging(null); setOver(null) }}
            onDrop={(e) => { e.preventDefault(); const from = dragging ?? Number(e.dataTransfer.getData('text/plain')); setDragging(null); setOver(null); if (!Number.isNaN(from)) onChange(move(items, from, i)) }}
            className={`relative min-w-0 rounded-[var(--radius-card)] border bg-white p-3 transition-[opacity] ${dragging === i ? 'opacity-40' : ''} ${isOver ? 'border-gold-400' : 'border-line'}`}
          >
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-2.5 cursor-grab text-ink-300 active:cursor-grabbing"><GripVertical className="size-4" /></span>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <input value={item.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label menu" className={inputCls} aria-label="Label menu" />
                <span className="relative min-w-0">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                  <input
                    value={item.href}
                    onChange={(e) => update(i, { href: e.target.value })}
                    list="ksp-routes"
                    placeholder={hasChildren ? 'Boleh dikosongkan' : '/produk atau https://…'}
                    className={`${inputCls} mono pl-8`}
                    aria-label="Tautan"
                  />
                  {linkLabel(item.href, options) ? (
                    <span className="mt-1 block truncate text-[11.5px] text-ink-400">→ {linkLabel(item.href, options)}</span>
                  ) : isGroup ? (
                    <span className="mt-1 block truncate text-[11.5px] text-ink-400">→ hanya pembuka submenu, tidak bisa diklik</span>
                  ) : null}
                </span>
              </div>
              <span className="flex shrink-0 items-center">
                <Reorder
                  onUp={() => onChange(move(items, i, i - 1))}
                  onDown={() => onChange(move(items, i, i + 1))}
                  upDisabled={i === 0}
                  downDisabled={i === items.length - 1}
                />
                {allowChildren ? (
                  <IconButton size="sm" label={`Tambah ${childLabel}`} onClick={() => update(i, { children: [...(item.children ?? []), { label: '', href: '' }] })}>
                    <CornerDownRight className="size-3.5" />
                  </IconButton>
                ) : null}
                <IconButton size="sm" label="Hapus item" onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
              </span>
            </div>

            {item.children?.length ? (
              <ul className="mt-2 grid gap-1.5 border-l-2 border-line pl-4 sm:ml-6">
                {item.children.map((child, k) => (
                  <li key={k} className="flex min-w-0 items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <input value={child.label} onChange={(e) => update(i, { children: item.children!.map((c, m) => (m === k ? { ...c, label: e.target.value } : c)) })} placeholder={`Label ${childLabel}`} className={`${inputCls} !py-2 text-[13px]`} aria-label={`Label ${childLabel}`} />
                      <input value={child.href} onChange={(e) => update(i, { children: item.children!.map((c, m) => (m === k ? { ...c, href: e.target.value } : c)) })} list="ksp-routes" placeholder="/produk/pinjaman" className={`${inputCls} mono !py-2 text-[13px]`} aria-label="Tautan" />
                    </div>
                    <span className="flex shrink-0 items-center">
                      <Reorder
                        compact
                        onUp={() => update(i, { children: move(item.children!, k, k - 1) })}
                        onDown={() => update(i, { children: move(item.children!, k, k + 1) })}
                        upDisabled={k === 0}
                        downDisabled={k === item.children!.length - 1}
                      />
                      <IconButton size="sm" label="Hapus" onClick={() => update(i, { children: item.children!.filter((_, m) => m !== k) })} className="hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      })}

      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...items, { label: '', href: '' }])}>
          <Plus className="size-3.5" /> Tambah item menu
        </Button>
      </div>
    </div>
  )
}
