'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Menu, X, Search, ExternalLink, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Spinner, Kbd } from '@/components/ui'
import { CommandPalette } from '@/components/CommandPalette'
import { NAV, NAV_GROUPS } from '@/components/nav'
import { LP_URL as LP } from '@/lib/site'


function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c-1.1 3.2-3.4 5-6 6.3 0 6 2.6 10.2 6 12.7 3.4-2.5 6-6.7 6-12.7-2.6-1.3-4.9-3.1-6-6.3Z" />
    </svg>
  )
}

/**
 * The console shell: a navy instrument rail on the left, paper workspace on
 * the right. The rail is dark so the workspace reads as the page and the
 * navigation as the frame around it, the way a viewfinder frames a shot.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  useEffect(() => setOpen(false), [pathname])

  const visible = useMemo(() => NAV.filter((item) => item.perms.length === 0 || can(...item.perms)), [can])
  const current = useMemo(
    () => [...visible].sort((a, b) => b.href.length - a.href.length).find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href))),
    [visible, pathname],
  )

  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Memeriksa sesi…" /></div>
  if (!user) return null

  const initials = user.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <div className="flex min-h-screen">
      {/* ── rail ── */}
      <aside
        className={`grid-dark fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] shrink-0 flex-col bg-ink-900 text-white transition-transform duration-300 [transition-timing-function:var(--ease-settle)] lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-white/10 text-gold-300 ring-1 ring-inset ring-white/10">
            <Mark className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[13.5px] font-bold">KSP Sari Sedana Bali</span>
            <span className="mono block text-[10.5px] text-white/45">konsol · v2</span>
          </span>
          <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="ml-auto grid size-8 place-items-center rounded-[6px] text-white/60 hover:bg-white/10 lg:hidden">
            <X className="size-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('ksp:palette'))}
          className="mx-3 mt-3 flex h-9 items-center gap-2.5 rounded-[var(--radius-input)] border border-white/10 bg-white/[0.04] px-3 text-[12.5px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span className="flex-1 text-left">Cari atau lompat…</span>
          <span className="flex items-center gap-1 opacity-70"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>

        <nav aria-label="Menu utama" className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const items = visible.filter((i) => i.group === group)
            if (!items.length) return null
            return (
              <div key={group} className="mb-5">
                <p className="mb-1.5 px-3 text-[10.5px] font-semibold tracking-[0.04em] text-white/35">{group}</p>
                <ul className="grid gap-px">
                  {items.map((item) => {
                    const active = current?.href === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`group/nav relative flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13px] font-medium transition-colors ${
                            active ? 'bg-white/[0.08] text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          {active ? <span aria-hidden="true" className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-gold-300" /> : null}
                          <item.icon className={`size-4 shrink-0 ${active ? 'text-gold-300' : 'text-white/40 group-hover/nav:text-white/70'}`} aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <a
            href={LP}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-[12.5px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Lihat website
            <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-white/35">
              <span aria-hidden="true" className="pulse-dot size-1.5 rounded-full bg-green-400" />
              live
            </span>
          </a>
          <div className="flex items-center gap-3 rounded-[var(--radius-tile)] bg-white/[0.04] p-2.5 ring-1 ring-inset ring-white/10">
            <span className="mono grid size-8 shrink-0 place-items-center rounded-[6px] bg-gold-300 text-[11px] font-semibold text-ink-900">{initials}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-semibold text-white">{user.name}</span>
              <span className="block truncate text-[11px] text-white/45">{user.roles[0] ?? user.email}</span>
            </span>
            <button onClick={signOut} aria-label="Keluar" title="Keluar" className="grid size-7 shrink-0 place-items-center rounded-[6px] text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {open ? <div className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-[1px] lg:hidden" onClick={() => setOpen(false)} /> : null}

      {/* ── workspace ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} aria-label="Buka menu" className="grid size-9 place-items-center rounded-[6px] text-ink-700 hover:bg-ink-100 lg:hidden">
            <Menu className="size-5" />
          </button>
          <nav aria-label="Lokasi" className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-400">
            <span className="hidden sm:inline">{current?.group ?? 'Konsol'}</span>
            <ChevronRight className="hidden size-3.5 sm:inline" aria-hidden="true" />
            <span className="truncate font-semibold text-ink-900">{current?.label ?? 'Konsol'}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('ksp:palette'))}
              className="hidden h-8 items-center gap-2 rounded-[var(--radius-input)] border border-line bg-white px-2.5 text-[12px] text-ink-500 transition-colors hover:border-ink-900 hover:text-ink-900 sm:flex"
            >
              <Search className="size-3.5" aria-hidden="true" />
              Cari
              <span className="flex items-center gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
            </button>
            <span className="mono hidden rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] text-ink-500 lg:inline-flex">
              {new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div key={pathname} className="rise mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      <CommandPalette items={visible} onSignOut={() => void signOut()} />
    </div>
  )
}
