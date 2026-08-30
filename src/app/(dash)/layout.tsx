'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui'

/** Navigation is filtered by permission, so each role sees only what it can use. */
const NAV = [
  { label: 'Ringkasan', href: '/', perms: [] as string[] },
  { label: 'Calon Nasabah', href: '/leads', perms: ['leads:read:all', 'leads:read:branch'] },
  { label: 'Halaman', href: '/halaman', perms: ['pages:read'] },
  { label: 'Berita', href: '/berita', perms: ['posts:read'] },
  { label: 'Produk', href: '/produk', perms: ['products:read'] },
  { label: 'Kantor', href: '/kantor', perms: ['branches:read'] },
  { label: 'Media', href: '/media', perms: ['media:read'] },
  { label: 'Pengguna', href: '/pengguna', perms: ['users:read'] },
  { label: 'Peran & Hak Akses', href: '/peran', perms: ['roles:read', 'roles:manage'] },
  { label: 'Pengaturan', href: '/pengaturan', perms: ['settings:manage'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [loading, user, pathname, router])

  useEffect(() => setOpen(false), [pathname])

  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Memeriksa sesi…" /></div>
  if (!user) return null

  const visible = NAV.filter((item) => item.perms.length === 0 || can(...item.perms))

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-ink-200 px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5c-1.1 3.2-3.4 5-6 6.3 0 6 2.6 10.2 6 12.7 3.4-2.5 6-6.7 6-12.7-2.6-1.3-4.9-3.1-6-6.3Z" />
            </svg>
          </span>
          <span className="text-sm font-bold leading-tight text-ink-900">
            KSP Sari Sedana
            <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-400">Dashboard</span>
          </span>
        </div>

        <nav aria-label="Menu utama" className="flex flex-col gap-0.5 p-3">
          {visible.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-ink-200 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
          <button onClick={signOut} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-600 hover:bg-ink-100">
            Keluar
          </button>
        </div>
      </aside>

      {open ? <div className="fixed inset-0 z-30 bg-ink-900/30 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Buka menu" className="grid size-10 place-items-center rounded-lg hover:bg-ink-100">
            <svg viewBox="0 0 24 24" className="size-5" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
          <span className="font-bold text-ink-900">Dashboard</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
