'use client'

import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { DEFAULT_BRAND, type BrandSettings } from '@/contracts'
import { useSettings } from '@/lib/use-settings'
import { Card, PageHeader, Spinner, Button, Field, inputCls, IconButton } from '@/components/ui'
import { MediaPicker } from '@/components/MediaPicker'

interface Site { name: string; legalName: string; tagline: string; description: string; email: string; phone: string; whatsapp: string }
const SITE_EMPTY: Site = { name: '', legalName: '', tagline: '', description: '', email: '', phone: '', whatsapp: '' }

function LogoField({ label, hint, value, onChange, dark }: { label: string; hint: string; value: string; onChange: (v: string) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Field label={label} hint={hint}>
      <div className={`flex items-center gap-3 rounded-[var(--radius-input)] border border-line p-2 ${dark ? 'grid-dark bg-ink-900' : 'bg-white'}`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-12 max-w-[160px] object-contain" />
        ) : (
          <span className={`px-2 text-[12.5px] ${dark ? 'text-white/50' : 'text-ink-400'}`}>Memakai lambang daun bawaan</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Button type="button" variant={dark ? 'secondary' : 'secondary'} size="sm" onClick={() => setOpen(true)}><ImagePlus className="size-3.5" /> {value ? 'Ganti' : 'Pilih'}</Button>
          {value ? <IconButton label="Hapus logo" onClick={() => onChange('')} className={dark ? 'text-white/60 hover:!bg-white/10 hover:!text-white' : ''}><X className="size-4" /></IconButton> : null}
        </span>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} value={value} onSelect={(m) => { onChange(m.url); setOpen(false) }} />
    </Field>
  )
}

export default function IdentityPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const site = s.group<Site>('site', SITE_EMPTY)
  const brand = s.group<BrandSettings>('brand', DEFAULT_BRAND)
  const setSite = (k: keyof Site, v: string) => s.setGroup('site', { ...site, [k]: v })
  const setBrand = (k: keyof BrandSettings, v: string) => s.setGroup('brand', { ...brand, [k]: v })

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Identitas"
        subtitle="Nama, logo dan kontak yang dipakai di seluruh halaman. Ubah sekali, berlaku di mana-mana."
        action={<Button variant="dark" onClick={() => void s.save(['site', 'brand'])} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Merek" description="Yang tampil di header, footer, dan tab peramban.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama tampilan" hint="Contoh: KSP Sari Sedana Bali"><input value={brand.name} onChange={(e) => setBrand('name', e.target.value)} className={inputCls} /></Field>
              <Field label="Slogan" hint="Baris kecil di bawah nama."><input value={brand.tagline} onChange={(e) => setBrand('tagline', e.target.value)} className={inputCls} /></Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <LogoField label="Logo (latar terang)" hint="PNG/SVG transparan, tinggi ±48 px." value={brand.logo} onChange={(v) => setBrand('logo', v)} />
              <LogoField label="Logo (latar gelap)" hint="Versi putih untuk footer dan banner." value={brand.logoLight} onChange={(v) => setBrand('logoLight', v)} dark />
            </div>
          </Card>

          <Card title="Identitas & kontak" description="Dipakai oleh tombol WhatsApp, footer, dan data terstruktur untuk Google.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama koperasi"><input value={site.name} onChange={(e) => setSite('name', e.target.value)} className={inputCls} /></Field>
              <Field label="Nama badan hukum"><input value={site.legalName} onChange={(e) => setSite('legalName', e.target.value)} className={inputCls} /></Field>
              <Field label="Email"><input type="email" value={site.email} onChange={(e) => setSite('email', e.target.value)} className={inputCls} /></Field>
              <Field label="Telepon utama"><input value={site.phone} onChange={(e) => setSite('phone', e.target.value)} className={`${inputCls} tnum`} /></Field>
              <Field label="Nomor WhatsApp" hint="Dipakai tombol Hubungi Kami di seluruh website. Tulis tanpa spasi, contoh 081337168194."><input value={site.whatsapp} onChange={(e) => setSite('whatsapp', e.target.value)} className={`${inputCls} tnum`} /></Field>
            </div>
            <div className="mt-4">
              <Field label="Deskripsi singkat koperasi" hint="Satu paragraf. Dipakai sebagai deskripsi default di hasil pencarian Google.">
                <textarea rows={3} value={site.description} onChange={(e) => setSite('description', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="grid h-fit min-w-0 gap-4 xl:sticky xl:top-20">
          <Card title="Pratinjau merek" description="Kira-kira begini di header dan footer.">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-[var(--radius-tile)] border border-line bg-white p-3">
                {brand.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logo} alt="" className="h-9 object-contain" /> : <span className="grid size-9 place-items-center rounded-[6px] bg-green-600 text-white text-[12px] font-bold">SS</span>}
                <span className="leading-tight"><span className="block text-[14px] font-extrabold text-ink-900">{brand.name || 'Nama koperasi'}</span><span className="block text-[11px] text-ink-400">{brand.tagline}</span></span>
              </div>
              <div className="grid-dark flex items-center gap-3 rounded-[var(--radius-tile)] bg-ink-900 p-3">
                {brand.logoLight || brand.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logoLight || brand.logo} alt="" className="h-9 object-contain" /> : <span className="grid size-9 place-items-center rounded-[6px] bg-white/10 text-gold-300 text-[12px] font-bold">SS</span>}
                <span className="leading-tight"><span className="block text-[14px] font-extrabold text-white">{brand.name || 'Nama koperasi'}</span><span className="block text-[11px] text-white/50">{brand.tagline}</span></span>
              </div>
            </div>
          </Card>
          <Card tone="paper" className="p-4 text-[12.5px] leading-relaxed text-ink-500">
            Nomor WhatsApp dan telepon di sini adalah nomor <strong className="text-ink-700">koperasi</strong>. Nomor tiap kantor diatur di menu <strong className="text-ink-700">Kantor</strong>.
          </Card>
        </div>
      </div>
    </>
  )
}
