'use client'

import { Signpost } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Redirect {
  id: string
  fromPath: string
  toPath: string
  statusCode: number
  isActive: boolean
  note?: string | null
}

const FIELDS: TableField<Redirect>[] = [
  {
    key: 'fromPath', label: 'Alamat lama', type: 'text', width: 300, required: true,
    placeholder: '/produk-simpanan-sijakop',
    hint: 'Harus diawali garis miring. Inilah alamat yang masih dibuka orang atau masih terdaftar di Google.',
  },
  {
    key: 'toPath', label: 'Dialihkan ke', type: 'text', width: 300, required: true,
    placeholder: '/produk/simpanan',
    hint: 'Alamat tujuan di situs ini, atau alamat lengkap jika ke situs lain.',
  },
  {
    key: 'statusCode', label: 'Jenis', type: 'select', width: 180, defaultValue: 301,
    options: [
      { value: '301', label: '301 · Pindah permanen' },
      { value: '302', label: '302 · Pindah sementara' },
      { value: '308', label: '308 · Permanen, metode tetap' },
      { value: '410', label: '410 · Halaman dihapus' },
    ],
    hint: 'Pakai 301 untuk halaman yang benar-benar pindah; peringkat pencariannya ikut berpindah.',
  },
  { key: 'isActive', label: 'Aktif', type: 'boolean', width: 110, defaultValue: true },
  {
    key: 'note', label: 'Catatan', type: 'text', width: 260, hiddenByDefault: true,
    hint: 'Kenapa pengalihan ini dibuat, agar mudah ditelusuri nanti.',
  },
]

/**
 * Redirects for addresses that changed, chiefly the WordPress ones.
 *
 * The site reads this list in its middleware, so a row added here takes effect
 * without a deploy. Values arrive from the form as strings; statusCode goes back
 * as the number the API expects.
 */
export default function RedirectsPage() {
  return (
    <ResourceList<Redirect>
      title="Pengalihan Alamat"
      subtitle="Mengarahkan alamat lama ke halaman yang benar, agar tautan lama dan hasil pencarian Google tidak berujung ke halaman 404."
      endpoint="/redirects"
      viewKey="pengalihan"
      writePermission="redirects:manage"
      emptyIcon={<Signpost className="size-5" />}
      emptyBody="Belum ada pengalihan. Tambahkan satu ketika sebuah halaman berpindah alamat."
      fields={FIELDS}
      recordTitle={(r) => r.fromPath}
      transformOut={(v) => ({ ...v, statusCode: Number(v.statusCode) })}
    />
  )
}
