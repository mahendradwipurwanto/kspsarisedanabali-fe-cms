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
  feedback_form: [{ label: 'Kantor', href: '/kantor' }],
  app_download: [{ label: 'Aplikasi', href: '/pengaturan/aplikasi' }],
  // legality_bar is deliberately absent: the website draws it from the block's
  // own items and logos alone, so pointing an editor at the settings screen
  // sent them to edit numbers the bar never reads.
}

/**
 * Blocks that draw only part of their content from elsewhere. The org chart's
 * board comes from the organisation settings while its "Kelompok jabatan" is
 * left empty, and the counter's figures come from Pencapaian while its own
 * list is empty; everything else on those blocks is a field below. Telling an
 * editor "not from the fields below" would send them to the wrong screen.
 */
const PARTIAL: Record<string, { lead: string; tail: string }> = {
  org_chart: {
    lead: 'Kelompok jabatan diambil dari',
    tail: ' selama kolom “Kelompok jabatan” di bawah kosong. Kotak lainnya (Rapat Anggota, SPI, pimpinan, unit kerja) diisi di kolom di bawah.',
  },
  stats_counter: {
    lead: 'Angka-angkanya diambil dari',
    tail: ' selama daftar di bawah kosong; isi daftar itu bila halaman ini perlu angka yang berbeda.',
  },
  app_download: {
    lead: 'Tautan App Store dan Google Play diambil dari',
    tail: ' di Pengaturan. Judul, teks, poin, dan gambarnya diisi di kolom di bawah.',
  },
}

export function BlockDataSource({ type }: { type: string }) {
  const sources = SOURCES[type]
  if (!sources?.length) return null
  const wording = PARTIAL[type] ?? { lead: 'Isinya diambil dari', tail: ', bukan dari kolom di bawah.' }

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-[var(--radius-input)] border border-line bg-paper px-3 py-2 text-[12.5px] text-ink-500">
      <Database className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
      {wording.lead}
      {sources.map((s, i) => (
        <span key={s.href}>
          {i > 0 ? <span className="text-ink-300"> dan </span> : null}
          <Link href={s.href} className="font-semibold text-green-700 hover:underline">{s.label}</Link>
        </span>
      ))}
      <span>{wording.tail}</span>
    </p>
  )
}
