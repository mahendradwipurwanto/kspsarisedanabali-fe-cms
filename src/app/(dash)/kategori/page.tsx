'use client'

import { Tags } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface PostCategory { id: string; name: string; slug: string; description?: string | null }

const FIELDS: TableField<PostCategory>[] = [
  { key: 'name', label: 'Nama kategori', type: 'text', width: 260, required: true },
  {
    key: 'slug', label: 'Slug', type: 'slug', width: 220, required: true, deriveFrom: 'name',
    hint: 'Gunakan huruf kecil dan tanda hubung (-). Dipakai di alamat /berita?kategori=…',
  },
  {
    key: 'description', label: 'Keterangan', type: 'longtext', width: 340, rows: 3,
    hint: 'Catatan untuk redaksi. Tidak tampil di website.',
  },
]

/** Categories for Berita. A post picks one of these from its own form. */
export default function PostCategoriesPage() {
  return (
    <ResourceList<PostCategory>
      title="Kategori Berita"
      subtitle="Kelompok berita seperti Pengumuman, Kegiatan atau Prestasi. Kategori yang dipilih sebuah berita tampil sebagai label di halaman berita itu."
      endpoint="/post-categories"
      viewKey="kategori"
      writePermission="posts:write"
      emptyIcon={<Tags className="size-5" />}
      emptyBody="Tambahkan kategori agar berita bisa dikelompokkan dan pembaca menemukan topik yang dicarinya."
      fields={FIELDS}
      recordTitle={(r) => r.name}
      panelNote={
        <p className="text-[12px] leading-relaxed text-ink-500">
          Kategori yang masih dipakai berita tidak bisa dihapus — pindahkan beritanya ke kategori lain terlebih dahulu.
        </p>
      }
    />
  )
}
