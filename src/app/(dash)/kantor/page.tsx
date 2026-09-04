'use client'

import { MapPin } from 'lucide-react'
import { ResourceList, type GridField } from '@/components/ResourceList'

interface Branch {
  id: string; name: string; slug: string; type: string; address: string
  district?: string | null; village?: string | null
  phone?: string | null; whatsapp?: string | null
  latitude: number; longitude: number; isActive: boolean
}

const FIELDS: GridField<Branch>[] = [
  { key: 'name', label: 'Nama kantor', type: 'text', width: 220, required: true, secondary: (r) => r.address },
  {
    key: 'type', label: 'Jenis', type: 'select', width: 120, required: true,
    options: [{ value: 'pusat', label: 'Pusat', tone: 'green' }, { value: 'cabang', label: 'Cabang', tone: 'grey' }],
  },
  { key: 'address', label: 'Alamat', type: 'longtext', width: 320, required: true, hint: 'Tulis alamat asli, bukan kode plus Google Maps.' },
  { key: 'district', label: 'Kecamatan', type: 'text', width: 150 },
  { key: 'village', label: 'Desa / Banjar', type: 'text', width: 150 },
  { key: 'phone', label: 'Telepon', type: 'text', width: 150, hint: 'Contoh: 0366 5438200' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text', width: 150, hint: 'Contoh: 081337168194' },
  { key: 'latitude', label: 'Latitude', type: 'number', width: 130, required: true, hint: 'Contoh: -8.4231' },
  { key: 'longitude', label: 'Longitude', type: 'number', width: 130, required: true, hint: 'Contoh: 115.4712' },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 120 },
  { key: 'slug', label: 'Slug', type: 'text', width: 180, required: true },
]

export default function BranchesPage() {
  return (
    <ResourceList<Branch>
      title="Kantor"
      subtitle="Alamat, telepon, dan koordinat kantor. Data ini yang dibaca Google untuk pencarian lokal."
      endpoint="/branches"
      viewKey="kantor"
      writePermission="branches:write"
      emptyIcon={<MapPin className="size-5" />}
      emptyBody="Tambahkan kantor agar muncul di halaman lokasi dan pencari kantor terdekat."
      fields={FIELDS}
      recordTitle={(r) => r.name}
      panelNote={<p className="text-[12px] leading-relaxed text-ink-500">Jam buka tiap kantor diatur langsung di basis data. Hubungi pengembang bila perlu diubah.</p>}
    />
  )
}
