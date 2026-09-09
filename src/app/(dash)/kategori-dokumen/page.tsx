'use client'

import { FolderTree } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface DocumentCategory {
  id: string; name: string; slug: string; icon?: string | null; description?: string | null; sortOrder: number
}

const FIELDS: TableField<DocumentCategory>[] = [
  { key: 'name', label: 'Nama jenis', type: 'text', width: 240, required: true, hint: 'Tampil sebagai judul rak dan nama tab di halaman Laporan Keuangan. Contoh: Laporan Triwulan.' },
  {
    key: 'slug', label: 'Slug', type: 'slug', width: 200, required: true, deriveFrom: 'name',
    hint: 'Huruf kecil dan tanda hubung. Dokumen menyimpan slug ini, jadi ubah dengan hati-hati bila sudah dipakai.',
  },
  { key: 'icon', label: 'Ikon', type: 'icon', width: 140, hint: 'Ikon pada tab di website.' },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 100, defaultValue: 0, hint: 'Urutan tab, dari yang terkecil.' },
  { key: 'description', label: 'Keterangan', type: 'longtext', width: 320, rows: 2, hint: 'Catatan untuk pengelola. Tidak tampil di website.' },
]

/**
 * The kinds a document can be. Four came with the site; a koperasi that starts
 * publishing quarterly reports adds a fifth here and it appears as a tab.
 */
export default function DocumentCategoriesPage() {
  return (
    <ResourceList<DocumentCategory>
      title="Kategori Dokumen"
      subtitle="Jenis dokumen — Laporan Tahunan, Laporan Keuangan, dan yang lain. Setiap jenis menjadi satu rak dan satu tab di halaman Laporan Keuangan."
      endpoint="/document-categories"
      viewKey="kategori-dokumen"
      writePermission="documents:write"
      emptyIcon={<FolderTree className="size-5" />}
      emptyBody="Tambahkan jenis dokumen agar dokumen bisa dikelompokkan ke rak masing-masing."
      fields={FIELDS}
      recordTitle={(r) => r.name}
      panelNote={
        <p className="text-[12px] leading-relaxed text-ink-500">
          Jenis yang masih dipakai dokumen tidak bisa dihapus — pindahkan dokumennya ke jenis lain terlebih dahulu.
        </p>
      }
    />
  )
}
