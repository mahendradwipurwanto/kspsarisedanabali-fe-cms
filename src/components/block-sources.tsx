'use client'

import Link from 'next/link'
import { Database } from 'lucide-react'

/**
 * Where a block's records come from.
 *
 * A block like "Daftar Dokumen" carries only its heading: the documents
 * themselves are a collection edited on its own screen. Without this, an editor
 * opens the block, finds no list, and has nowhere to go.
 */
const SOURCES: Record<string, { label: string; href: string }[]> = {
  product_grid: [{ label: 'Produk', href: '/produk' }],
  hero_banner: [{ label: 'Produk', href: '/produk' }],
  simulation_calculator: [{ label: 'Produk', href: '/produk' }],
  simulation_tabs: [{ label: 'Produk', href: '/produk' }],
  profiling_wizard: [{ label: 'Produk', href: '/produk' }, { label: 'Kantor', href: '/kantor' }],
  news_list: [{ label: 'Berita', href: '/berita' }],
  post_index: [{ label: 'Berita', href: '/berita' }],
  branch_finder: [{ label: 'Kantor', href: '/kantor' }],
  contact_cards: [{ label: 'Kantor', href: '/kantor' }],
  branch_contact_strip: [{ label: 'Kantor', href: '/kantor' }],
  stats_counter: [{ label: 'Pencapaian', href: '/pencapaian' }],
  testimonial_slider: [{ label: 'Testimoni', href: '/testimoni' }],
  document_list: [{ label: 'Dokumen', href: '/dokumen' }],
  faq_index: [{ label: 'Tanya Jawab', href: '/tanya-jawab' }],
  job_list: [{ label: 'Lowongan', href: '/lowongan' }],
  org_chart: [{ label: 'Legalitas & Organisasi', href: '/pengaturan/profil' }],
  lead_form: [{ label: 'Produk', href: '/produk' }, { label: 'Kantor', href: '/kantor' }],
  legality_bar: [{ label: 'Legalitas & Organisasi', href: '/pengaturan/profil' }],
}

export function BlockDataSource({ type }: { type: string }) {
  const sources = SOURCES[type]
  if (!sources?.length) return null

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-[var(--radius-input)] border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-500">
      <Database className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
      Isinya diambil dari
      {sources.map((s, i) => (
        <span key={s.href}>
          {i > 0 ? <span className="text-ink-300"> dan </span> : null}
          <Link href={s.href} className="font-semibold text-green-700 hover:underline">{s.label}</Link>
        </span>
      ))}
      <span>, bukan dari kolom di bawah.</span>
    </p>
  )
}
