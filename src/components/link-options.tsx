'use client'

import { useEffect, useState } from 'react'
import { INTERNAL_ROUTES } from '@/contracts'
import { api } from '@/lib/api'

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

/** Autocomplete list shared by the menu editor and every link field in a block. */
export function LinkDatalist({ id, options }: { id: string; options: LinkOption[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => <option key={o.href} value={o.href}>{o.label}</option>)}
    </datalist>
  )
}

export const linkLabel = (href: string, options: LinkOption[]) => options.find((o) => o.href === href)?.label
