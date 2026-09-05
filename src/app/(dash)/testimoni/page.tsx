'use client'

import { Quote } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Testimonial {
  id: string; name: string; role?: string | null; location?: string | null
  quote: string; rating: number; avatar?: string | null; sortOrder: number; isActive: boolean
}

const FIELDS: TableField<Testimonial>[] = [
  { key: 'name', label: 'Nama anggota', type: 'text', required: true, secondary: (r) => [r.role, r.location].filter(Boolean).join(' · ') },
  { key: 'quote', label: 'Kutipan', type: 'longtext', width: 380, required: true, rows: 5 },
  { key: 'rating', label: 'Bintang', type: 'number', width: 110, defaultValue: 5, hint: '1 sampai 5.' },
  { key: 'role', label: 'Pekerjaan', type: 'text', width: 170 },
  { key: 'location', label: 'Asal', type: 'text', width: 170 },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 130, defaultValue: true },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 100, hiddenByDefault: true, defaultValue: 0 },
  { key: 'avatar', label: 'Foto', type: 'image', panelOnly: true },
]

/** The quotes behind the "Testimoni Anggota" block. */
export default function TestimonialsPage() {
  return (
    <ResourceList<Testimonial>
      title="Testimoni"
      subtitle="Kutipan anggota yang tampil di beranda. Dipakai blok Testimoni Anggota."
      endpoint="/testimonials"
      viewKey="testimoni"
      writePermission="testimonials:write"
      emptyIcon={<Quote className="size-5" />}
      emptyBody="Tambahkan kutipan anggota agar calon nasabah melihat pengalaman nyata."
      fields={FIELDS}
      recordTitle={(r) => r.name}
    />
  )
}
