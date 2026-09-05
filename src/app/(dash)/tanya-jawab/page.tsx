'use client'

import { HelpCircle } from 'lucide-react'
import { ResourceList, type TableField } from '@/components/ResourceList'

interface Faq { id: string; question: string; answer: string; category?: string | null; sortOrder: number; isActive: boolean }

const FIELDS: TableField<Faq>[] = [
  { key: 'question', label: 'Pertanyaan', type: 'text', width: 340, required: true },
  { key: 'answer', label: 'Jawaban', type: 'longtext', width: 420, required: true, rows: 5 },
  {
    key: 'category', label: 'Kategori', type: 'select', width: 160,
    options: [
      { value: 'umum', label: 'Umum' },
      { value: 'keanggotaan', label: 'Keanggotaan' },
      { value: 'simpanan', label: 'Simpanan' },
      { value: 'pinjaman', label: 'Pinjaman' },
    ],
    hint: 'Menentukan kelompoknya di halaman Tanya Jawab dan mana yang muncul di halaman Simulasi.',
  },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 130, defaultValue: true },
  { key: 'sortOrder', label: 'Urutan', type: 'number', width: 100, hiddenByDefault: true, defaultValue: 0 },
]

/** The entries behind the "Tanya Jawab Lengkap" block. */
export default function FaqsPage() {
  return (
    <ResourceList<Faq>
      title="Tanya Jawab"
      subtitle="Pertanyaan yang sering diajukan calon anggota. Dipakai blok Tanya Jawab Lengkap di halaman Tanya Jawab dan Simulasi."
      endpoint="/faqs"
      viewKey="tanya-jawab"
      writePermission="faqs:write"
      emptyIcon={<HelpCircle className="size-5" />}
      emptyBody="Tambahkan pertanyaan dan jawabannya agar pengunjung menemukan jawabannya sendiri."
      fields={FIELDS}
      recordTitle={(r) => r.question}
    />
  )
}
