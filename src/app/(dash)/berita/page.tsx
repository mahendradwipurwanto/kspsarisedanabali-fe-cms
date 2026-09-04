'use client'

import { Newspaper } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Post {
  id: string; title: string; slug: string; status: string; publishedAt: string | null
  excerpt?: string | null; content?: string | null; coverImage?: string | null
}

const FIELDS: TableField<Post>[] = [
  { key: 'title', label: 'Judul', type: 'text', width: 300, required: true, secondary: (r) => `/${r.slug}` },
  {
    key: 'status', label: 'Status', type: 'select', width: 120,
    options: [{ value: 'draft', label: 'Draf', variant: 'secondary' }, { value: 'review', label: 'Review', variant: 'warning' }, { value: 'published', label: 'Terbit', variant: 'success' }],
  },
  { key: 'publishedAt', label: 'Tanggal terbit', type: 'date', width: 150 },
  { key: 'coverImage', label: 'Sampul', type: 'image', width: 80 },
  { key: 'excerpt', label: 'Ringkasan', type: 'longtext', width: 320, hint: 'Muncul di kartu berita dan hasil pencarian Google.' },
  { key: 'slug', label: 'Slug', type: 'text', width: 200, required: true, hint: 'Huruf kecil dan tanda hubung.' },
  { key: 'content', label: 'Isi berita (HTML)', type: 'longtext', rows: 12, panelOnly: true, hint: 'Gunakan <p>, <h2>, <ul>, <li>, <strong>, <a>.' },
]

export default function PostsPage() {
  return (
    <ResourceList<Post>
      title="Berita"
      subtitle="Berita dan artikel yang tampil di halaman /berita."
      endpoint="/posts"
      viewKey="berita"
      writePermission="posts:write"
      emptyIcon={<Newspaper className="size-5" />}
      emptyBody="Tulis berita pertama agar pengunjung melihat aktivitas koperasi."
      fields={FIELDS}
      recordTitle={(r) => r.title}
    />
  )
}
