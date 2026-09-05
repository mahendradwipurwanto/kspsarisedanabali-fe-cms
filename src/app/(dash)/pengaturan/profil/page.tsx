'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useSettings } from '@/lib/use-settings'
import { Card, PageHeader, Spinner, Button, Field, inputCls, IconButton, SectionTitle } from '@/components/ui'

interface LegalRow { label: string; value: string; date: string }
interface OrgGroup { title: string; members: { name: string; role?: string }[] }

export default function ProfileSettingsPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const legal = s.group<LegalRow[]>('legal', [])
  const org = s.group<OrgGroup[]>('organization', [])

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Profil & legalitas"
        subtitle="Legalitas dan susunan organisasi koperasi. Dipakai di footer, bilah legalitas, dan blok Struktur Organisasi."
        action={<Button variant="dark" onClick={() => void s.save(['legal', 'organization'])} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5">
        <Card tone="paper" className="p-4">
          <p className="text-[13px] leading-relaxed text-ink-600">
            Cerita koperasi, visi, misi dan tujuan ditulis di halaman <strong className="text-ink-900">Tentang Kami</strong>, blok demi blok.
            Buka <Link href="/halaman" className="font-semibold text-green-700 hover:underline">Halaman</Link> lalu pilih Tentang Kami.
            Yang di bawah ini dipakai di footer dan blok Struktur Organisasi.
          </p>
        </Card>

        <Card title="Legalitas" description="Tampil di footer dan bilah legalitas. Nomor badan hukum, tanggal pengesahan, dan sejenisnya.">
          <ul className="grid gap-2">
            {legal.map((row, i) => (
              <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_auto]">
                <input value={row.label} placeholder="Label, mis. Badan Hukum" onChange={(e) => s.setGroup('legal', legal.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={inputCls} aria-label="Label" />
                <input value={row.value} placeholder="Nomor" onChange={(e) => s.setGroup('legal', legal.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={`${inputCls} mono`} aria-label="Nilai" />
                <input value={row.date} placeholder="Tanggal" onChange={(e) => s.setGroup('legal', legal.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className={inputCls} aria-label="Tanggal" />
                <IconButton label="Hapus" onClick={() => s.setGroup('legal', legal.filter((_, j) => j !== i))} className="mt-1 hover:!text-red-600"><Trash2 className="size-4" /></IconButton>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => s.setGroup('legal', [...legal, { label: '', value: '', date: '' }])}><Plus className="size-3.5" /> Baris legalitas</Button>
        </Card>

        <Card title="Susunan organisasi" description="Kelompok (Penasehat, Pengurus, Pengawas) dan anggotanya. Blok Struktur Organisasi di halaman memakai data ini bila tidak diisi sendiri.">
          <div className="grid gap-4 lg:grid-cols-3">
            {org.map((group, gi) => (
              <div key={gi} className="rounded-[var(--radius-card)] border border-line bg-paper/60 p-3.5">
                <div className="flex items-center gap-2">
                  <input value={group.title} placeholder="Nama kelompok" onChange={(e) => s.setGroup('organization', org.map((x, j) => (j === gi ? { ...x, title: e.target.value } : x)))} className={`${inputCls} font-semibold`} aria-label="Nama kelompok" />
                  <IconButton label="Hapus kelompok" onClick={() => s.setGroup('organization', org.filter((_, j) => j !== gi))} className="hover:!text-red-600"><Trash2 className="size-4" /></IconButton>
                </div>
                <ul className="mt-3 grid gap-2">
                  {group.members.map((m, mi) => (
                    <li key={mi} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-1.5">
                      <input value={m.name} placeholder="Nama" onChange={(e) => s.setGroup('organization', org.map((x, j) => (j === gi ? { ...x, members: x.members.map((y, k) => (k === mi ? { ...y, name: e.target.value } : y)) } : x)))} className={`${inputCls} !py-2 text-[13px]`} aria-label="Nama" />
                      <input value={m.role ?? ''} placeholder="Jabatan" onChange={(e) => s.setGroup('organization', org.map((x, j) => (j === gi ? { ...x, members: x.members.map((y, k) => (k === mi ? { ...y, role: e.target.value } : y)) } : x)))} className={`${inputCls} !py-2 text-[13px]`} aria-label="Jabatan" />
                      <IconButton size="sm" label="Hapus anggota" onClick={() => s.setGroup('organization', org.map((x, j) => (j === gi ? { ...x, members: x.members.filter((_, k) => k !== mi) } : x)))} className="mt-1 hover:!text-red-600"><Trash2 className="size-3.5" /></IconButton>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => s.setGroup('organization', org.map((x, j) => (j === gi ? { ...x, members: [...x.members, { name: '', role: '' }] } : x)))}><Plus className="size-3.5" /> Anggota</Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => s.setGroup('organization', [...org, { title: '', members: [] }])}><Plus className="size-3.5" /> Kelompok</Button>
        </Card>
      </div>
    </>
  )
}
