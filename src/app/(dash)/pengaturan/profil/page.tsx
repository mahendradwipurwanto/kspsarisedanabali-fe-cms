'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useSettings } from '@/lib/use-settings'
import { Card, PageHeader, Spinner, Button, Field, inputCls, IconButton, SectionTitle } from '@/components/ui'

interface Profile { about: string; vision: string; mission: string; missionPoints: { letter: string; text: string }[]; goals: string[] }
interface LegalRow { label: string; value: string; date: string }
interface OrgGroup { title: string; members: { name: string; role?: string }[] }

const PROFILE_EMPTY: Profile = { about: '', vision: '', mission: '', missionPoints: [], goals: [] }

export default function ProfileSettingsPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const profile = s.group<Profile>('profile', PROFILE_EMPTY)
  const legal = s.group<LegalRow[]>('legal', [])
  const org = s.group<OrgGroup[]>('organization', [])
  const setProfile = (next: Partial<Profile>) => s.setGroup('profile', { ...profile, ...next })

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Profil & legalitas"
        subtitle="Cerita koperasi, visi-misi, legalitas, dan susunan organisasi. Dipakai di halaman Tentang Kami dan footer."
        action={<Button variant="dark" onClick={() => void s.save(['profile', 'legal', 'organization'])} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5">
        <Card title="Profil">
          <div className="grid gap-4">
            <Field label="Tentang koperasi" hint="Satu atau dua paragraf."><textarea rows={4} value={profile.about} onChange={(e) => setProfile({ about: e.target.value })} className={inputCls} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Visi"><textarea rows={3} value={profile.vision} onChange={(e) => setProfile({ vision: e.target.value })} className={inputCls} /></Field>
              <Field label="Misi"><textarea rows={3} value={profile.mission} onChange={(e) => setProfile({ mission: e.target.value })} className={inputCls} /></Field>
            </div>

            <div>
              <SectionTitle hint="Huruf dan penjelasan, misalnya P — Prioritas layanan.">Poin misi</SectionTitle>
              <ul className="grid gap-2">
                {profile.missionPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <input value={p.letter} maxLength={2} onChange={(e) => setProfile({ missionPoints: profile.missionPoints.map((x, j) => (j === i ? { ...x, letter: e.target.value.toUpperCase() } : x)) })} className={`${inputCls} mono w-14 text-center`} aria-label="Huruf" />
                    <input value={p.text} onChange={(e) => setProfile({ missionPoints: profile.missionPoints.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} className={inputCls} aria-label="Penjelasan" />
                    <IconButton label="Hapus" onClick={() => setProfile({ missionPoints: profile.missionPoints.filter((_, j) => j !== i) })} className="mt-1 hover:!text-red-600"><Trash2 className="size-4" /></IconButton>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setProfile({ missionPoints: [...profile.missionPoints, { letter: '', text: '' }] })}><Plus className="size-3.5" /> Poin</Button>
            </div>

            <div>
              <SectionTitle>Tujuan</SectionTitle>
              <ul className="grid gap-2">
                {profile.goals.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <input value={g} onChange={(e) => setProfile({ goals: profile.goals.map((x, j) => (j === i ? e.target.value : x)) })} className={inputCls} aria-label={`Tujuan ${i + 1}`} />
                    <IconButton label="Hapus" onClick={() => setProfile({ goals: profile.goals.filter((_, j) => j !== i) })} className="mt-1 hover:!text-red-600"><Trash2 className="size-4" /></IconButton>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setProfile({ goals: [...profile.goals, ''] })}><Plus className="size-3.5" /> Tujuan</Button>
            </div>
          </div>
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
