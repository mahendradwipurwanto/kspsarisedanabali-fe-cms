'use client'

import { useRef, useState } from 'react'
import { GripVertical, Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { getBlock } from '@/contracts'
import { IconButton } from './ui'

export interface EditorBlock { id?: string; type: string; props: Record<string, unknown>; isVisible: boolean }

/**
 * Re-orderable list of the blocks on a page.
 *
 * Native HTML5 drag and drop: the list is short, vertical and single-container,
 * which is the one case the native API handles well. Dragging is never the
 * only way to reorder: every row keeps ↑ ↓ buttons and answers Ctrl/Cmd +
 * arrows when focused, because a pointer-only reorder is unusable with a
 * keyboard or a screen reader.
 */
export function BlockList({
  blocks, active, onSelect, onReorder, onDuplicate, onRemove, onToggleVisible,
}: {
  blocks: EditorBlock[]
  active: number
  onSelect: (i: number) => void
  onReorder: (from: number, to: number) => void
  onDuplicate: (i: number) => void
  onRemove: (i: number) => void
  onToggleVisible: (i: number) => void
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const lastOver = useRef<number | null>(null)

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return
    onReorder(from, to)
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) }
  }

  return (
    <ul className="grid gap-1" aria-label="Susunan blok halaman">
      {blocks.map((block, i) => {
        const def = getBlock(block.type)
        const isActive = i === active
        const isDragging = dragging === i
        const isOver = over === i && dragging !== null && dragging !== i

        return (
          <li
            key={block.id ?? `${block.type}-${i}`}
            draggable
            onDragStart={(e) => {
              setDragging(i)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(i))
            }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(i); lastOver.current = i }}
            onDragEnd={() => { setDragging(null); setOver(null); lastOver.current = null }}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragging ?? Number(e.dataTransfer.getData('text/plain'))
              const to = lastOver.current ?? i
              setDragging(null); setOver(null); lastOver.current = null
              if (!Number.isNaN(from)) move(from, to)
            }}
            className={`relative min-w-0 rounded-[var(--radius-tile)] transition-[opacity] ${isDragging ? 'opacity-40' : ''}`}
          >
            {isOver ? <span aria-hidden="true" className="absolute -top-[3px] inset-x-1 h-[2px] rounded-full bg-gold-400" /> : null}
            <div
              className={`group/blk flex min-w-0 items-center gap-1 overflow-hidden rounded-[var(--radius-tile)] border py-1.5 pl-1 pr-1.5 transition-colors ${
                isActive ? 'border-ink-900 bg-ink-900 text-white' : 'border-transparent hover:border-line hover:bg-white'
              } ${!block.isVisible && !isActive ? 'opacity-60' : ''}`}
            >
              <span aria-hidden="true" title="Tarik untuk memindahkan" className={`cursor-grab select-none px-0.5 active:cursor-grabbing ${isActive ? 'text-white/40' : 'text-ink-300'}`}>
                <GripVertical className="size-4" />
              </span>

              <button type="button" onClick={() => onSelect(i)} onKeyDown={(e) => onKeyDown(e, i)} aria-current={isActive} className="min-w-0 flex-1 overflow-hidden text-left">
                <span className={`flex min-w-0 items-center gap-1.5 text-[13px] font-semibold ${isActive ? 'text-white' : 'text-ink-800'}`}>
                  {!block.isVisible ? <EyeOff className={`size-3.5 shrink-0 ${isActive ? 'text-gold-300' : 'text-ink-400'}`} aria-label="Disembunyikan" /> : null}
                  <span className="truncate">{def?.label ?? block.type}</span>
                </span>
                <span className={`mono mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[10px] ${isActive ? 'text-white/45' : 'text-ink-400'}`}>
                  <span className="tnum">{String(i + 1).padStart(2, '0')}</span>
                  {def?.headingLevel ? <span>{def.headingLevel}</span> : null}
                  <span className="truncate">{def?.category?.toLowerCase()}</span>
                </span>
              </button>

              <span className={`shrink-0 items-center focus-within:flex group-hover/blk:flex ${isActive ? 'flex [&_button]:text-white/60 [&_button:hover]:bg-white/10 [&_button:hover]:text-white' : 'hidden'}`}>
                <IconButton size="sm" label={block.isVisible ? 'Sembunyikan blok' : 'Tampilkan blok'} onClick={() => onToggleVisible(i)}>
                  {block.isVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconButton>
                <IconButton size="sm" label="Duplikat blok" onClick={() => onDuplicate(i)}><Copy className="size-3.5" /></IconButton>
                <IconButton size="sm" label="Hapus blok" onClick={() => onRemove(i)} className="hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
              </span>

              <span className={`flex shrink-0 flex-col ${isActive ? '[&_button]:text-white/50 [&_button:hover]:text-white' : ''}`}>
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Naikkan blok" className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronUp className="size-3.5" /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} aria-label="Turunkan blok" className="grid size-4 place-items-center text-ink-400 hover:text-ink-900 disabled:opacity-30"><ChevronDown className="size-3.5" /></button>
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
