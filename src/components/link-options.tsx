'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Link2, Search } from 'lucide-react'
import { INTERNAL_ROUTES } from '@/contracts'
import { api } from '@/lib/api'
import { inputCls } from './ui'
import { cn } from '@/lib/utils'

export interface LinkOption { href: string; label: string; group: string }

const FIXED: LinkOption[] = INTERNAL_ROUTES.map((r) => ({ ...r, group: 'Halaman bawaan' }))

let cache: Promise<LinkOption[]> | null = null

/**
 * Every address an editor can link to: the website's fixed routes plus the
 * pages made in the console, so a new static page can be put in the menu by
 * name rather than by remembering its slug.
 */
export function useLinkOptions(): LinkOption[] {
  const [options, setOptions] = useState<LinkOption[]>(FIXED)

  useEffect(() => {
    cache ??= api
      .get<{ data: { title: string; slug: string; status: string }[] }>('/pages?limit=200')
      .then((r) =>
        r.data
          .filter((p) => p.slug !== '/')
          .map((p) => ({
            href: `/${p.slug}`,
            label: p.status === 'published' ? p.title : `${p.title} (draf)`,
            group: 'Halaman dari konsol',
          })),
      )
      .catch(() => [])
    let alive = true
    void cache.then((pages) => {
      if (!alive) return
      const seen = new Set(FIXED.map((f) => f.href))
      setOptions([...FIXED, ...pages.filter((p) => !seen.has(p.href))])
    })
    return () => { alive = false }
  }, [])

  return options
}

export const linkLabel = (href: string, options: LinkOption[]) => options.find((o) => o.href === href)?.label

/**
 * The address field, shared by the menu editor and every link field in a block.
 *
 * This was a native `<datalist>`, which filters its options against whatever is
 * already in the box. A field holding `/simulasi` therefore opened onto nothing
 * — the browser had matched the value and had nothing left to offer — so the
 * list only ever appeared while the field was empty. Here the arrow always
 * shows every address, each with its page name, under a search box of its own —
 * so looking for a page never overwrites the address the field already holds.
 * Typing in the field itself still narrows the list, and an external https://
 * address can be typed straight in.
 *
 * The list is rendered at the body and positioned against the field, because
 * both screens that use it put the field inside something that clips.
 */
export function LinkInput({
  value, onChange, placeholder, className, label = 'Tautan', compact, extra,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  label?: string
  compact?: boolean
  /** Addresses only this field understands, listed above the site's own. */
  extra?: LinkOption[]
}) {
  const loaded = useLinkOptions()
  // Deduped by address: the list is keyed on it, and two entries sharing one
  // key let React keep a filtered-out row on screen.
  const options = useMemo(() => {
    const seen = new Set<string>()
    return [...(extra ?? []), ...loaded].filter((o) => !seen.has(o.href) && seen.add(o.href))
  }, [extra, loaded])
  const [open, setOpen] = useState(false)
  // Typing in the field narrows the list; opening it from the arrow does not.
  const [typing, setTyping] = useState(false)
  // Searching inside the panel, which leaves the field's own value alone.
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const [box, setBox] = useState<{ left: number; top: number; width: number; drop: boolean } | null>(null)
  const wrap = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const search = useRef<HTMLInputElement>(null)

  const shown = useMemo(() => {
    const q = (query.trim() || (typing ? value.trim() : '')).toLowerCase()
    if (!q) return options
    return options.filter((o) => o.href.toLowerCase().includes(q) || o.label.toLowerCase().includes(q))
  }, [options, value, typing, query])

  const place = useCallback(() => {
    const r = wrap.current?.getBoundingClientRect()
    if (!r) return
    // Flip above when the field sits too near the bottom of the window.
    const drop = r.bottom + 300 < window.innerHeight || r.top < 300
    setBox({ left: r.left, top: drop ? r.bottom + 4 : r.top - 4, width: r.width, drop })
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (wrap.current?.contains(t) || panel.current?.contains(t)) return
      setOpen(false)
    }
    // `true` so a scroll inside any ancestor repositions the list too.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    document.addEventListener('pointerdown', close)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
      document.removeEventListener('pointerdown', close)
    }
  }, [open, place])

  const choose = (href: string) => {
    onChange(href)
    setOpen(false)
    setTyping(false)
    setQuery('')
    field.current?.focus()
  }

  const openList = () => {
    setTyping(false)
    setQuery('')
    setHighlight(-1)
    setOpen(true)
    // The search box is the point of opening it, so put the cursor there.
    setTimeout(() => search.current?.focus(), 0)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setTyping(false); setQuery(''); setOpen(true); setHighlight(0); return }
      setHighlight((h) => {
        const next = e.key === 'ArrowDown' ? h + 1 : h - 1
        return next < 0 ? shown.length - 1 : next >= shown.length ? 0 : next
      })
      return
    }
    if (e.key === 'Enter' && open && highlight >= 0 && shown[highlight]) {
      e.preventDefault()
      choose(shown[highlight]!.href)
    }
  }

  let lastGroup = ''

  return (
    <span ref={wrap} className="relative block min-w-0">
      <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input
        ref={field}
        value={value}
        onChange={(e) => { onChange(e.target.value); setTyping(true); setQuery(''); setHighlight(-1); if (!open) setOpen(true) }}
        onKeyDown={onKeyDown}
        onFocus={() => { setTyping(false); setQuery(''); setOpen(true) }}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className={cn(inputCls, 'mono pl-8 pr-9', compact && '!py-2 text-[13px]', className)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Tutup daftar alamat' : 'Lihat semua alamat'}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => { if (open) { setOpen(false); field.current?.focus() } else openList() }}
        className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[6px] text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && box && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panel}
              style={{
                position: 'fixed',
                left: box.left,
                width: Math.max(box.width, 240),
                ...(box.drop ? { top: box.top } : { bottom: window.innerHeight - box.top }),
              }}
              className="z-[70] overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-lift)]"
            >
              {/* Searching here leaves the field's own value alone, so browsing
                  the site's pages cannot overwrite an address already set. */}
              <div className="relative border-b border-line p-1.5">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                  ref={search}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setHighlight(-1) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setOpen(false); field.current?.focus(); return }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      setHighlight((h) => {
                        const next = e.key === 'ArrowDown' ? h + 1 : h - 1
                        return next < 0 ? shown.length - 1 : next >= shown.length ? 0 : next
                      })
                      return
                    }
                    if (e.key === 'Enter' && highlight >= 0 && shown[highlight]) { e.preventDefault(); choose(shown[highlight]!.href) }
                  }}
                  placeholder="Cari halaman…"
                  aria-label="Cari halaman"
                  className="h-8 w-full rounded-[6px] bg-paper pl-8 pr-2.5 text-[12.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
                />
              </div>
              <div className="scroll-thin max-h-[16rem] overflow-y-auto p-1">
              {shown.length === 0 ? (
                <p className="px-3 py-3 text-[12.5px] text-ink-400">
                  Tidak ada alamat yang cocok. Alamat luar seperti https://… tetap bisa diketik langsung.
                </p>
              ) : (
                shown.map((o, i) => {
                  const heading = o.group !== lastGroup ? o.group : null
                  lastGroup = o.group
                  const current = o.href === value
                  return (
                    <div key={o.href}>
                      {heading ? (
                        <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-400">{heading}</p>
                      ) : null}
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => choose(o.href)}
                        onMouseEnter={() => setHighlight(i)}
                        className={cn(
                          'block w-full rounded-[6px] px-2.5 py-2 text-left transition-colors',
                          i === highlight ? 'bg-paper' : '',
                          current ? 'bg-green-50' : '',
                        )}
                      >
                        <span className={cn('mono block truncate text-[12.5px]', current ? 'font-semibold text-green-800' : 'text-ink-800')}>{o.href}</span>
                        <span className="block truncate text-[11.5px] text-ink-400">{o.label}</span>
                      </button>
                    </div>
                  )
                })
              )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
