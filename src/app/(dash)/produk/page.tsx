'use client'

import { Package } from 'lucide-react'
import { ResourceList, type GridField } from '@/components/ResourceList'
import { mediaSrc } from '@/lib/api'

interface Product {
  id: string; name: string; slug: string; category: string; tagline?: string | null
  ratePercent?: number | null; rateMethod: string; minAmount?: number | null; maxAmount?: number | null
  isActive: boolean; isVerified: boolean; rateSource?: string | null; image?: string | null
  tenorOptions?: number[]
}

const FIELDS: GridField<Product>[] = [
  { key: 'name', label: 'Nama produk', type: 'text', width: 240, required: true, secondary: (r) => r.tagline ?? `/${r.slug}` },
  { key: 'image', label: 'Brosur', type: 'image', width: 80, render: undefined },
  {
    key: 'category', label: 'Kategori', type: 'select', width: 130, required: true,
    options: [{ value: 'simpanan', label: 'Simpanan', tone: 'green' }, { value: 'pinjaman', label: 'Pinjaman', tone: 'gold' }],
  },
  { key: 'tagline', label: 'Kalimat penarik', type: 'text', width: 260 },
  {
    key: 'ratePercent', label: 'Bunga /tahun', type: 'percent', width: 130,
    hint: 'Tulis per tahun. Contoh: 1,3% per bulan ditulis 15.6.',
  },
  {
    key: 'rateMethod', label: 'Metode bunga', type: 'select', width: 150,
    options: [
      { value: 'none', label: 'Tanpa hitung' }, { value: 'flat', label: 'Flat' },
      { value: 'annuity', label: 'Anuitas' }, { value: 'effective', label: 'Efektif' },
    ],
  },
  { key: 'minAmount', label: 'Plafon minimum', type: 'currency', width: 150 },
  { key: 'maxAmount', label: 'Plafon maksimum', type: 'currency', width: 155 },
  {
    key: 'isVerified', label: 'Terverifikasi', type: 'boolean', width: 120,
    hint: 'Selama belum dicentang, website tidak menampilkan suku bunga produk ini dan kalkulator melewatinya.',
  },
  { key: 'isActive', label: 'Tampil di web', type: 'boolean', width: 120 },
  { key: 'slug', label: 'Slug', type: 'text', width: 180, hint: 'Huruf kecil dan tanda hubung. Contoh: pinjaman-bunga-murah.', required: true },
  { key: 'rateNote', label: 'Catatan bunga', type: 'text', width: 220, hint: 'Contoh: 1,3% per bulan, metode flat.' },
  { key: 'summary', label: 'Ringkasan', type: 'longtext', panelOnly: true, hint: 'Muncul di kartu produk dan sebagai deskripsi Google.' },
  { key: 'description', label: 'Deskripsi lengkap', type: 'longtext', rows: 8, panelOnly: true },
  { key: 'benefits', label: 'Manfaat', type: 'list', panelOnly: true, hint: 'Satu manfaat per baris.' },
  { key: 'requirements', label: 'Persyaratan', type: 'list', panelOnly: true, hint: 'Satu syarat per baris.' },
  { key: 'tenorOptions', label: 'Pilihan jangka waktu', type: 'list', panelOnly: true, hint: 'Satu angka bulan per baris. Contoh: 12, 24, 36.' },
  { key: 'rateSource', label: 'Sumber angka', type: 'text', panelOnly: true, hint: 'Dari mana suku bunga dan plafon ini berasal? Contoh: SK Pengurus No. … tanggal ….' },
]

/** Numbers arrive from the list editor as strings; the API wants integers. */
function transformOut(values: Record<string, unknown>) {
  if (!('tenorOptions' in values)) return values
  const raw = values.tenorOptions
  const list = Array.isArray(raw) ? raw : []
  return { ...values, tenorOptions: list.map((v) => Number(String(v).replace(/\D/g, ''))).filter((n) => n > 0) }
}

export default function ProductsPage() {
  return (
    <ResourceList<Product>
      title="Produk"
      subtitle="Produk simpanan dan pinjaman. Suku bunga di sini dipakai kalkulator simulasi di website."
      endpoint="/products"
      viewKey="produk"
      writePermission="products:write"
      emptyIcon={<Package className="size-5" />}
      emptyBody="Tambahkan produk simpanan atau pinjaman agar tampil di website."
      fields={FIELDS.map((f) => (f.key === 'image' ? { ...f, render: (r: Product) => (
        r.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={mediaSrc(r.image)} alt="" className="size-7 rounded-[4px] border border-line object-cover" />
          : <span className="text-ink-300">—</span>
      ) } : f))}
      transformOut={transformOut}
      recordTitle={(r) => r.name}
    />
  )
}
