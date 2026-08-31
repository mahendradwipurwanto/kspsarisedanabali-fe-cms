'use client'

import { formatRupiahShort } from '@/contracts'
import { ResourceList, Pill } from '@/components/ResourceList'

interface Product {
  id: string; name: string; slug: string; category: string; tagline?: string | null
  ratePercent?: number | null; rateMethod: string; minAmount?: number | null; maxAmount?: number | null; isActive: boolean
  isVerified: boolean; rateSource?: string | null
}

export default function ProductsPage() {
  return (
    <ResourceList<Product>
      title="Produk"
      subtitle="Produk simpanan dan pinjaman. Suku bunga di sini dipakai oleh kalkulator simulasi di website."
      endpoint="/products"
      writePermission="products:write"
      emptyBody="Tambahkan produk simpanan atau pinjaman agar tampil di website."
      columns={[
        { header: 'Nama', cell: (r) => (<><span className="block font-semibold text-ink-900">{r.name}</span><span className="block text-xs text-ink-500">{r.tagline ?? `/${r.slug}`}</span></>) },
        { header: 'Kategori', cell: (r) => <Pill tone={r.category === 'pinjaman' ? 'amber' : 'green'}>{r.category === 'pinjaman' ? 'Pinjaman' : 'Simpanan'}</Pill> },
        { header: 'Bunga', cell: (r) => (r.ratePercent != null ? <span className="tnum">{(r.ratePercent / 12).toFixed(2).replace('.', ',')}% / bln</span> : '—') },
        { header: 'Plafon', cell: (r) => (r.minAmount != null && r.maxAmount != null ? <span className="tnum text-xs">{formatRupiahShort(r.minAmount)}–{formatRupiahShort(r.maxAmount)}</span> : '—') },
        { header: 'Angka', cell: (r) => (r.isVerified ? <Pill tone="green">Terverifikasi</Pill> : <Pill tone="amber">Belum diverifikasi</Pill>) },
        { header: 'Status', cell: (r) => <Pill tone={r.isActive ? 'green' : 'grey'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Pill> },
      ]}
      editFields={[
        { name: 'name', label: 'Nama produk', required: true },
        { name: 'slug', label: 'Alamat halaman (slug)', hint: 'Huruf kecil dan tanda hubung. Contoh: pinjaman-bunga-murah', required: true },
        { name: 'category', label: 'Kategori', type: 'select', required: true, options: [{ value: 'simpanan', label: 'Simpanan' }, { value: 'pinjaman', label: 'Pinjaman' }] },
        { name: 'tagline', label: 'Kalimat pendek penarik perhatian' },
        { name: 'summary', label: 'Ringkasan', type: 'textarea', hint: 'Muncul di kartu produk dan sebagai deskripsi Google.' },
        { name: 'description', label: 'Deskripsi lengkap', type: 'textarea' },
        { name: 'benefits', label: 'Manfaat', type: 'list', hint: 'Satu manfaat per baris.' },
        { name: 'requirements', label: 'Persyaratan', type: 'list', hint: 'Satu syarat per baris.' },
        { name: 'rateMethod', label: 'Metode perhitungan bunga', type: 'select', options: [{ value: 'none', label: 'Tanpa perhitungan' }, { value: 'flat', label: 'Flat' }, { value: 'annuity', label: 'Anuitas' }, { value: 'effective', label: 'Efektif menurun' }] },
        { name: 'ratePercent', label: 'Bunga per tahun (%)', type: 'number', hint: 'Contoh: 1,3% per bulan ditulis 15.6' },
        { name: 'rateNote', label: 'Catatan bunga', hint: 'Contoh: 1,3% per bulan, metode flat' },
        { name: 'minAmount', label: 'Plafon minimum (Rp)', type: 'number' },
        { name: 'maxAmount', label: 'Plafon maksimum (Rp)', type: 'number' },
        { name: 'rateSource', label: 'Sumber angka', hint: 'Dari mana suku bunga dan plafon ini berasal? Contoh: "SK Pengurus No. … tanggal …".' },
        { name: 'isVerified', label: 'Angka sudah diverifikasi pengurus', type: 'boolean', hint: 'Selama belum dicentang, website TIDAK menampilkan suku bunga produk ini dan kalkulator simulasi melewatinya. Centang hanya setelah suku bunga, plafon, dan tenor dipastikan benar.' },
        { name: 'isActive', label: 'Tampilkan di website', type: 'boolean' },
      ]}
    />
  )
}
