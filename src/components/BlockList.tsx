'use client'

import { useRef, useState } from 'react'
import { getBlock } from '@/contracts'

export interface EditorBlock { id?: string; type: string; props: Record<string, unknown>; isVisible: boolean }

/**
 * Re-orderable list of the blocks on a page.
 *
 * Drag and drop uses the native HTML5 API rather than a library: the list is
 * short, vertical, and single-container, which is the one case the native API
 * handles well — and it keeps a drag-and-drop dependency out of a CMS whose
 * whole point is being maintainable by whoever inherits it.
 *
 * Dragging is never the only way to reorder. Every row keeps ↑ ↓ buttons and
 * responds to Ctrl/Cmd + arrow keys when focused, because a pointer-only
 * reorder is unusable with a keyboard or a screen reader — and staff on a
 * laptop trackpad routinely find dragging fiddly too.
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
  // Guards against the drop firing on a stale index when the pointer leaves and
  // re-enters the list mid-drag.
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
              // Firefox refuses to start a drag without data on the transfer.
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
            className={`rounded-lg transition-[box-shadow,opacity,transform] ${isDragging ? 'opacity-40' : ''} ${
              isOver ? 'ring-2 ring-brand-400' : ''
            }`}
          >
            <div
              className={`group/blk flex items-center gap-1 rounded-lg px-1.5 py-2 ${
                isActive ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-ink-50'
              }`}
            >
              <span
                aria-hidden="true"
                title="Tarik untuk memindahkan"
                className="cursor-grab select-none px-1 text-ink-300 active:cursor-grabbing"
              >
                ⠿
              </span>

              <button
                type="button"
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                aria-current={isActive}
                className="min-w-0 flex-1 text-left"
              >
                <span className={`flex items-center gap-1.5 truncate text-sm font-medium ${isActive ? 'text-brand-700' : 'text-ink-800'}`}>
                  {!block.isVisible ? <span title="Disembunyikan" aria-label="Disembunyikan">🚫</span> : null}
                  <span className="truncate">{def?.label ?? block.type}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                  <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {def?.headingLevel ? <span>{def.headingLevel}</span> : null}
                </span>
              </button>

              <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/blk:opacity-100">
                <button type="button" onClick={() => onToggleVisible(i)} title={block.isVisible ? 'Sembunyikan' : 'Tampilkan'}
                  aria-label={block.isVisible ? 'Sembunyikan blok' : 'Tampilkan blok'}
                  className="px-1 text-xs text-ink-400 hover:text-ink-700">{block.isVisible ? '👁' : '🚫'}</button>
                <button type="button" onClick={() => onDuplicate(i)} title="Duplikat" aria-label="Duplikat blok"
                  className="px-1 text-xs text-ink-400 hover:text-ink-700">⧉</button>
                <button type="button" onClick={() => onRemove(i)} title="Hapus" aria-label="Hapus blok"
                  className="px-1 text-xs text-ink-400 hover:text-[#c4443a]">✕</button>
              </span>

              <span className="flex shrink-0 flex-col">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Naikkan blok"
                  className="px-1 text-[10px] leading-tight text-ink-400 hover:text-ink-700 disabled:opacity-30">▲</button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === blocks.length - 1} aria-label="Turunkan blok"
                  className="px-1 text-[10px] leading-tight text-ink-400 hover:text-ink-700 disabled:opacity-30">▼</button>
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
