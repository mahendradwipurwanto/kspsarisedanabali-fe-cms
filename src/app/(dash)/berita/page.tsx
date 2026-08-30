'use client'

import { ResourceList, Pill } from '@/components/ResourceList'
import { fmtDate } from '@/components/ui'

interface Post { id: string; title: string; slug: string; status: string; publishedAt: string | null; excerpt?: string | null }

export default function PostsPage() {
  return (
    <ResourceList<Post>
      title="Berita"
      subtitle="Berita dan artikel yang tampil di halaman /berita."
      endpoint="/posts"
      writePermission="posts:write"
      emptyBody="Tulis berita pertama agar pengunjung melihat aktivitas koperasi."
      columns={[
        { header: 'Judul', cell: (r) => (<><span className="block font-semibold text-ink-900">{r.title}</span><span className="block text-xs text-ink-500">/{r.slug}</span></>) },
        { header: 'Status', cell: (r) => <Pill tone={r.status === 'published' ? 'green' : 'grey'}>{r.status === 'published' ? 'Terbit' : 'Draf'}</Pill> },
        { header: 'Tanggal terbit', cell: (r) => fmtDate(r.publishedAt) },
      ]}
      editFields={[
        { name: 'title', label: 'Judul berita', required: true },
        { name: 'slug', label: 'Alamat halaman (slug)', required: true, hint: 'Huruf kecil dan tanda hubung.' },
        { name: 'excerpt', label: 'Ringkasan', type: 'textarea', hint: 'Muncul di kartu berita dan hasil pencarian Google.' },
        { name: 'content', label: 'Isi berita (HTML)', type: 'textarea', hint: 'Gunakan <p>, <h2>, <ul>, <li>, <strong>, <a>.' },
        { name: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draf' }, { value: 'published', label: 'Terbit' }] },
      ]}
    />
  )
}
