'use client'

import { TrendingUp } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Stat { id: string; label: string; value: string; icon?: string | null; sortOrder: number; isActive: boolean }

const FIELDS: TableField<Stat>[] = [
  { key: 'label', label: 'Keterangan', type: 'text', required: true, hint: 'Contoh: Total Aset, Anggota, SHU.' },
  { key: 'value', label: 'Angka', type: 'text', width: 180, required: true, hint: 'Tulis apa adanya, contoh: Rp500M+ atau 5.000+.' },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 110, defaultValue: 0 },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 130, defaultValue: true },
  { key: 'icon', label: 'Ikon', type: 'text', width: 140, hiddenByDefault: true, hint: 'Nama ikon, misalnya trending-up. Kosongkan untuk ikon bawaan.' },
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
