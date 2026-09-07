'use client'

import { TrendingUp } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Stat { id: string; label: string; value: string; icon?: string | null; sortOrder: number; isActive: boolean }

// The caps are the API's own; stating them here means a long label is caught
// while it is typed rather than refused in English after a failed save.
const FIELDS: TableField<Stat>[] = [
  { key: 'label', label: 'Keterangan', type: 'text', required: true, max: 60, hint: 'Contoh: Total Aset, Anggota, SHU.' },
  { key: 'value', label: 'Angka', type: 'text', width: 180, required: true, max: 40, hint: 'Tulis apa adanya, contoh: Rp500M+ atau 5.000+.' },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 110, plain: true, defaultValue: 0 },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 130, defaultValue: true },
  {
    key: 'icon', label: 'Ikon', type: 'icon', width: 150, max: 40, hiddenByDefault: true,
    hint: 'Tampil pada tata letak kartu. Tata letak “buku besar”, yang dipakai beranda dan Laporan Keuangan sekarang, hanya menampilkan angkanya.',
  },
]

/** The figures behind the "Pencapaian Koperasi" block on the home and report pages. */
export default function StatsPage() {
  return (
    <ResourceList<Stat>
      title="Pencapaian"
      subtitle="Angka pokok koperasi: aset, anggota, SHU, dan sejenisnya. Dipakai blok Pencapaian Koperasi di beranda dan halaman Laporan Keuangan."
      endpoint="/stats"
      viewKey="pencapaian"
      writePermission="settings:manage"
      emptyIcon={<TrendingUp className="size-5" />}
      emptyBody="Tambahkan angka pencapaian agar tampil di beranda dan halaman laporan."
      fields={FIELDS}
      recordTitle={(r) => r.label}
    />
  )
}
