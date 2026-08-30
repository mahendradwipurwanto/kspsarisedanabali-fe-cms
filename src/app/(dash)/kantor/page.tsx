'use client'

import { ResourceList, Pill } from '@/components/ResourceList'

interface Branch { id: string; name: string; slug: string; type: string; address: string; phone?: string | null; isActive: boolean }

export default function BranchesPage() {
  return (
    <ResourceList<Branch>
      title="Kantor"
      subtitle="Alamat, telepon, dan koordinat kantor. Data ini yang dibaca Google untuk pencarian lokal."
      endpoint="/branches"
      writePermission="branches:write"
      emptyBody="Tambahkan kantor agar muncul di halaman lokasi dan pencari kantor terdekat."
      columns={[
        { header: 'Nama', cell: (r) => (<><span className="block font-semibold text-ink-900">{r.name}</span><span className="block text-xs text-ink-500">{r.address}</span></>) },
        { header: 'Jenis', cell: (r) => <Pill tone={r.type === 'pusat' ? 'green' : 'grey'}>{r.type === 'pusat' ? 'Pusat' : 'Cabang'}</Pill> },
        { header: 'Telepon', cell: (r) => <span className="tnum">{r.phone ?? '—'}</span> },
        { header: 'Status', cell: (r) => <Pill tone={r.isActive ? 'green' : 'grey'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Pill> },
      ]}
      editFields={[
        { name: 'name', label: 'Nama kantor', required: true },
        { name: 'slug', label: 'Alamat halaman (slug)', required: true },
        { name: 'type', label: 'Jenis', type: 'select', options: [{ value: 'pusat', label: 'Kantor Pusat' }, { value: 'cabang', label: 'Kantor Cabang' }] },
        { name: 'address', label: 'Alamat lengkap', type: 'textarea', required: true, hint: 'Tulis alamat asli, bukan kode plus Google Maps.' },
        { name: 'district', label: 'Kecamatan' },
        { name: 'village', label: 'Desa / Banjar' },
        { name: 'phone', label: 'Nomor telepon', hint: 'Contoh: 0366 5438200' },
        { name: 'whatsapp', label: 'Nomor WhatsApp', hint: 'Contoh: 081337168194' },
        { name: 'latitude', label: 'Latitude', type: 'number', required: true, hint: 'Contoh: -8.4231' },
        { name: 'longitude', label: 'Longitude', type: 'number', required: true, hint: 'Contoh: 115.4712' },
        { name: 'isActive', label: 'Tampilkan di website', type: 'boolean' },
      ]}
    />
  )
}
