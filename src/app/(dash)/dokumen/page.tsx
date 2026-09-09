'use client'

import { FileText } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface DocumentItem {
  id: string; title: string; category: string; year?: number | null
  fileKey: string; fileSize?: number | null; coverImage?: string | null; isPublic: boolean; sortOrder: number
}

const FIELDS: TableField<DocumentItem>[] = [
  { key: 'title', label: 'Judul dokumen', type: 'text', required: true, secondary: (r) => (r.year ? `Tahun buku ${r.year}` : '') },
  {
    key: 'category', label: 'Jenis', type: 'select', width: 190, required: true,
    // The kinds are rows, not a list written here: a document stores the
    // kind's slug, and the picker offers whatever Kategori Dokumen holds.
    optionsEndpoint: '/document-categories', optionValue: 'slug',
    hint: 'Menentukan rak dan tab tempat dokumen ini tampil. Jenis baru ditambahkan di menu Kategori Dokumen.',
  },
  // A year, not a quantity: 2026 rather than 2.026.
  { key: 'year', label: 'Tahun buku', type: 'number', width: 120, plain: true },
  { key: 'fileKey', label: 'Berkas', type: 'file', width: 260, required: true, hint: 'PDF atau DOC. Diunggah langsung ke penyimpanan koperasi.' },
  {
    key: 'coverImage', label: 'Sampul', type: 'image', width: 80,
    hint: 'Opsional. Gambar sampul laporan, potret (rasio 3:4, misalnya 600×800 piksel). Tanpa sampul, kartu di website menampilkan penanda koperasi.',
  },
  { key: 'isPublic', label: 'Tampil di web', type: 'boolean', width: 130, defaultValue: true },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 100, hiddenByDefault: true, defaultValue: 0 },
]

/**
 * The documents behind the "Daftar Dokumen" block, which the Laporan Keuangan
 * page uses. Uploading here is what puts a report on the website.
 */
export default function DocumentsPage() {
  return (
    <ResourceList<DocumentItem>
      title="Dokumen"
      subtitle="Laporan tahunan, laporan keuangan, dan berkas legalitas yang bisa diunduh pengunjung. Dipakai blok Daftar Dokumen di halaman Laporan Keuangan."
      endpoint="/documents"
      viewKey="dokumen"
      writePermission="documents:write"
      emptyIcon={<FileText className="size-5" />}
      emptyBody="Unggah laporan tahunan atau laporan keuangan agar bisa diunduh dari halaman Laporan Keuangan."
      fields={FIELDS}
      recordTitle={(r) => r.title}
    />
  )
}
