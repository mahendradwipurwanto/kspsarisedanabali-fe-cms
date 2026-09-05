'use client'

import { Briefcase } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Job {
  id: string; title: string; slug: string; department?: string | null
  employmentType: string; location?: string | null; description?: string | null
  requirements?: string[]; closesAt?: string | null; isActive: boolean
}

const FIELDS: TableField<Job>[] = [
  { key: 'title', label: 'Posisi', type: 'text', required: true, secondary: (r) => r.location ?? '' },
  {
    key: 'employmentType', label: 'Jenis', type: 'select', width: 150, required: true,
    options: [
      { value: 'full_time', label: 'Penuh waktu', variant: 'success' },
      { value: 'part_time', label: 'Paruh waktu', variant: 'secondary' },
      { value: 'contract', label: 'Kontrak', variant: 'secondary' },
      { value: 'internship', label: 'Magang', variant: 'secondary' },
    ],
  },
  { key: 'department', label: 'Bagian', type: 'text', width: 160 },
  { key: 'location', label: 'Penempatan', type: 'text', width: 200, hint: 'Contoh: Kantor Cabang Rendang, Karangasem.' },
  { key: 'closesAt', label: 'Ditutup', type: 'date', width: 150 },
  { key: 'isActive', label: 'Dibuka', type: 'boolean', width: 110, defaultValue: true },
  { key: 'slug', label: 'Slug', type: 'text', width: 200, required: true, hint: 'Huruf kecil dan tanda hubung. Contoh: account-officer.' },
  { key: 'description', label: 'Deskripsi pekerjaan (HTML)', type: 'longtext', rows: 8, panelOnly: true, hint: 'Gunakan <p>, <ul>, <li>, <strong>.' },
  { key: 'requirements', label: 'Kualifikasi', type: 'list', panelOnly: true, hint: 'Satu kualifikasi per baris.' },
]

/** The vacancies behind the "Daftar Lowongan" block on the Karir page. */
export default function JobsPage() {
  return (
    <ResourceList<Job>
      title="Lowongan"
      subtitle="Lowongan kerja yang tampil di halaman Karir, lengkap dengan formulir lamaran. Dipakai blok Daftar Lowongan."
      endpoint="/jobs"
      viewKey="lowongan"
      writePermission="jobs:write"
      emptyIcon={<Briefcase className="size-5" />}
      emptyBody="Tambahkan lowongan agar pelamar bisa mengirim berkas lewat website."
      fields={FIELDS}
      recordTitle={(r) => r.title}
    />
  )
}
