'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/pengaturan', label: 'Identitas', exact: true },
  { href: '/pengaturan/header', label: 'Header & Menu' },
  { href: '/pengaturan/footer', label: 'Footer' },
  { href: '/pengaturan/seo', label: 'SEO & Sosial' },
  { href: '/pengaturan/profil', label: 'Profil & Legalitas' },
]

/** Website settings are one workspace with tabs; the sidebar lists the same
 *  screens so either route in gets an editor to the right place. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <>
      <nav aria-label="Bagian pengaturan" className="scroll-thin mb-6 flex max-w-full gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                active ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </>
  )
}
