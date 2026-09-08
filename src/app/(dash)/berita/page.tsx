'use client'

import { CalendarClock, Newspaper } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'
import { Alert, fmtDate } from '@/components/ui'
import { Badge } from '@/components/ui/badge'

interface Post {
  id: string; title: string; slug: string; status: string; publishedAt: string | null
  excerpt?: string | null; content?: string | null; coverImage?: string | null
  categoryId?: string | null
}

/**
 * Whether the website is actually showing this post.
 *
 * "Terbit" is only half the answer: the API hides a published post until its
 * publish date has arrived, which is how scheduling works — and why an editor
 * who set the status to Terbit alongside a date a week out saw nothing appear
 * and reported the site as broken. The state is now spelled out on the row.
 */
function liveState(publishedAt: string | null | undefined, status: string) {
  if (status !== 'published') return { label: 'Belum terbit', variant: 'secondary' as const }
  if (publishedAt && new Date(publishedAt).getTime() > Date.now()) {
    return { label: `Terjadwal ${fmtDate(publishedAt)}`, variant: 'warning' as const }
  }
  return { label: 'Tampil', variant: 'success' as const }
}

const FIELDS: TableField<Post>[] = [
  { key: 'title', label: 'Judul', type: 'text', width: 300, required: true, secondary: (r) => `/${r.slug}` },
  {
    key: 'status', label: 'Status', type: 'select', width: 120,
    options: [{ value: 'draft', label: 'Draf', variant: 'secondary' }, { value: 'review', label: 'Review', variant: 'warning' }, { value: 'published', label: 'Terbit', variant: 'success' }],
  },
  {
    key: 'live', label: 'Di website', type: 'readonly', width: 170,
    get: (r) => liveState(r.publishedAt, r.status).label,
    render: (r) => {
      const state = liveState(r.publishedAt, r.status)
      return <Badge variant={state.variant}>{state.label}</Badge>
    },
  },
  {
    key: 'categoryId', label: 'Kategori', type: 'select', width: 170,
    optionsEndpoint: '/post-categories',
    emptyOption: { value: '', label: 'Tanpa kategori' },
    hint: 'Tampil sebagai label di halaman berita. Kategorinya dikelola di menu Kategori Berita.',
  },
  {
    key: 'publishedAt', label: 'Tanggal terbit', type: 'date', width: 150,
    hint: 'Tanggal berita ini boleh mulai tampil. Tanggal yang masih di depan membuatnya tersimpan sebagai terjadwal — status Terbit pun belum muncul di website sampai tanggal itu tiba. Kosongkan untuk tampil begitu diterbitkan.',
  },
  { key: 'coverImage', label: 'Sampul', type: 'image', width: 80 },
  { key: 'excerpt', label: 'Ringkasan', type: 'longtext', width: 320, hint: 'Muncul di kartu berita dan hasil pencarian Google.' },
  { key: 'slug', label: 'Slug', type: 'slug', width: 200, required: true, deriveFrom: 'title', hint: 'Gunakan huruf kecil dan tanda hubung (-). Contoh: rapat-anggota-tahunan-2026.' },
  { key: 'content', label: 'Isi berita', type: 'richtext', panelOnly: true, hint: 'Tempel atau seret gambar langsung ke dalam tulisan. Tabel, tautan dan penomoran ada di baris tombol di atas.' },
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
      // An empty picker means "no category"; the API stores that as null.
      transformOut={(v) => ({ ...v, categoryId: v.categoryId ? v.categoryId : null })}
      // Said in the panel, while the date is still on screen and fixable —
      // the row badge only tells the editor afterwards.
      panelNote={(v) => {
        const date = typeof v.publishedAt === 'string' ? v.publishedAt : ''
        if (v.status !== 'published' || !date || new Date(date).getTime() <= Date.now()) return null
        return (
          <Alert tone="amber">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" aria-hidden="true" /> Belum tampil di website.
            </span>{' '}
            Tanggal terbitnya masih di depan ({fmtDate(date)}), jadi berita ini baru muncul pada tanggal tersebut.
            Ubah tanggalnya ke hari ini atau lebih awal agar langsung tampil.
          </Alert>
        )
      }}
    />
  )
}
