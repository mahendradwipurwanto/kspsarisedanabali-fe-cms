'use client'

import { FileText } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface DocumentItem {
  id: string; title: string; category: string; year?: number | null
  fileKey: string; fileSize?: number | null; isPublic: boolean; sortOrder: number
}

const FIELDS: TableField<DocumentItem>[] = [
  { key: 'title', label: 'Judul dokumen', type: 'text', required: true, secondary: (r) => (r.year ? `Tahun buku ${r.year}` : '') },
  {
    key: 'category', label: 'Jenis', type: 'select', width: 170, required: true,
    options: [
      { value: 'laporan', label: 'Laporan tahunan', variant: 'success' },
      { value: 'keuangan', label: 'Laporan keuangan', variant: 'success' },
      { value: 'legalitas', label: 'Legalitas & perizinan', variant: 'secondary' },
      { value: 'lainnya', label: 'Lainnya', variant: 'secondary' },
    ],
  },
  { key: 'year', label: 'Tahun buku', type: 'number', width: 120 },
  { key: 'fileKey', label: 'Berkas', type: 'file', width: 260, required: true, hint: 'PDF atau DOC. Diunggah langsung ke penyimpanan koperasi.' },
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
