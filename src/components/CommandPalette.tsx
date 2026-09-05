'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, ArrowRight, ExternalLink, FileText, LogOut } from 'lucide-react'
import { api } from '@/lib/api'
import { Kbd } from './ui'
import type { NavItem } from './nav'
import { LP_URL as LP } from '@/lib/site'


interface PageHit { id: string; title: string; slug: string; status: string }

/**
 * ⌘K palette. Navigation plus a live search over pages, so an editor who
 * remembers a page's name but not where it lives in the menu gets there in
 * three keystrokes. Pages load lazily on first open and are cached for the
 * session; nothing runs until the palette is actually used.
 */
export function CommandPalette({
  items, onSignOut,
}: { items: NavItem[]; onSignOut: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState<PageHit[] | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('ksp:palette', onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('ksp:palette', onOpen) }
  }, [])

  useEffect(() => {
    if (!open || pages !== null) return
    void api.get<{ data: PageHit[] }>('/pages?limit=100').then((r) => setPages(r.data)).catch(() => setPages([]))
  }, [open, pages])

  useEffect(() => { if (!open) setQuery('') }, [open])

  const go = (href: string) => { setOpen(false); router.push(href) }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-ink-950/55 p-4 pt-[12vh] backdrop-blur-[2px]" onClick={() => setOpen(false)}>
      <Command
        label="Perintah cepat"
        className="rise w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-white shadow-[var(--shadow-lift)]"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Cari halaman, menu, atau perintah…"
            className="h-12 w-full bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
          />
          <Kbd>Esc</Kbd>
        </div>

        <Command.List className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-400">Tidak ada yang cocok.</Command.Empty>

          <Command.Group heading="Buka">
            {items.map((item) => (
              <Command.Item key={item.href} value={`${item.label} ${item.group}`} onSelect={() => go(item.href)} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13.5px] text-ink-700">
                <item.icon className="size-4 text-ink-400" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[11px] text-ink-400">{item.group}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {pages?.length ? (
            <Command.Group heading="Halaman website">
              {pages.map((p) => (
                <Command.Item key={p.id} value={`halaman ${p.title} ${p.slug}`} onSelect={() => go(`/halaman/${p.id}`)} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13.5px] text-ink-700">
                  <FileText className="size-4 text-ink-400" aria-hidden="true" />
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="mono text-[11px] text-ink-400">/{p.slug === '/' ? '' : p.slug}</span>
                  {p.status !== 'published' ? <span className="rounded-full bg-gold-50 px-1.5 text-[10.5px] font-semibold text-gold-700">draf</span> : null}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          <Command.Group heading="Perintah">
            <Command.Item value="lihat website buka situs" onSelect={() => { setOpen(false); window.open(LP, '_blank', 'noopener') }} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13.5px] text-ink-700">
              <ExternalLink className="size-4 text-ink-400" aria-hidden="true" />
              <span className="flex-1">Buka website di tab baru</span>
            </Command.Item>
            <Command.Item value="keluar logout sign out" onSelect={() => { setOpen(false); onSignOut() }} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13.5px] text-ink-700">
              <LogOut className="size-4 text-ink-400" aria-hidden="true" />
              <span className="flex-1">Keluar dari konsol</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center gap-4 border-t border-line bg-paper px-4 py-2 text-[11.5px] text-ink-400">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> pilih</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> buka</span>
          <span className="ml-auto flex items-center gap-1.5"><ArrowRight className="size-3" /> <Kbd>⌘</Kbd><Kbd>K</Kbd> kapan saja</span>
        </div>
      </Command>
    </div>
  )
}
