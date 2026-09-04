'use client'

import { Facebook, Instagram, Youtube } from 'lucide-react'
import { useSettings } from '@/lib/use-settings'
import { Card, PageHeader, Spinner, Button, Field, inputCls } from '@/components/ui'

interface SeoDefaults { titleTemplate: string; defaultTitle: string; defaultDescription: string }
interface Social { facebook: string; instagram: string; youtube: string }
const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3000'

const Count = ({ n, lo, hi }: { n: number; lo: number; hi: number }) => (
  <span className={`tnum text-[11.5px] ${n === 0 ? 'text-ink-400' : n < lo || n > hi ? 'text-gold-600' : 'text-green-700'}`}>{n} / {hi}</span>
)

export default function SeoSettingsPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const seo = s.group<SeoDefaults>('seoDefaults', { titleTemplate: '%s | KSP Sari Sedana Bali', defaultTitle: '', defaultDescription: '' })
  const social = s.group<Social>('social', { facebook: '', instagram: '', youtube: '' })
  const setSeo = (k: keyof SeoDefaults, v: string) => s.setGroup('seoDefaults', { ...seo, [k]: v })
  const setSocial = (k: keyof Social, v: string) => s.setGroup('social', { ...social, [k]: v })

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="SEO & sosial"
        subtitle="Nilai bawaan untuk mesin pencari ketika sebuah halaman belum mengisi judul atau deskripsinya sendiri, dan tautan media sosial."
        action={<Button variant="dark" onClick={() => void s.save(['seoDefaults', 'social'])} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Bawaan mesin pencari">
            <div className="grid gap-4">
              <Field label="Pola judul" hint="%s diganti dengan judul halaman. Contoh: %s | KSP Sari Sedana Bali">
                <input value={seo.titleTemplate} onChange={(e) => setSeo('titleTemplate', e.target.value)} className={`${inputCls} mono`} />
              </Field>
              <Field label="Judul bawaan" hint="Dipakai beranda dan halaman tanpa judul khusus. Idealnya 50–60 karakter." counter={<Count n={seo.defaultTitle.length} lo={50} hi={60} />}>
                <input value={seo.defaultTitle} onChange={(e) => setSeo('defaultTitle', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Deskripsi bawaan" hint="Kalimat di bawah judul pada hasil pencarian. Idealnya 120–158 karakter." counter={<Count n={seo.defaultDescription.length} lo={120} hi={158} />}>
                <textarea rows={3} value={seo.defaultDescription} onChange={(e) => setSeo('defaultDescription', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Media sosial" description="Ikon di footer hanya tampil untuk akun yang diisi.">
            <div className="grid gap-4">
              {([['facebook', 'Facebook', Facebook], ['instagram', 'Instagram', Instagram], ['youtube', 'YouTube', Youtube]] as const).map(([key, label, IconCmp]) => (
                <Field key={key} label={label}>
                  <span className="relative block">
                    <IconCmp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                    <input value={social[key]} onChange={(e) => setSocial(key, e.target.value)} placeholder={`https://${key}.com/…`} className={`${inputCls} mono pl-9`} />
                  </span>
                </Field>
              ))}
            </div>
          </Card>
        </div>

        <div className="h-fit min-w-0 xl:sticky xl:top-20">
          <Card title="Tampilan di Google" description="Untuk halaman yang memakai nilai bawaan.">
            <div className="rounded-[var(--radius-tile)] border border-line bg-white p-3.5">
              <p className="flex items-center gap-2 text-[11.5px] text-ink-500"><span className="grid size-5 place-items-center rounded-full bg-green-600 text-[9px] font-bold text-white">S</span>{LP.replace(/^https?:\/\//, '')}</p>
              <p className="mt-1.5 truncate text-[16px] text-[#1a0dab]">{seo.defaultTitle || 'Judul bawaan belum diisi'}</p>
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">{seo.defaultDescription || 'Deskripsi bawaan belum diisi. Google akan memilih kalimat acak dari halaman.'}</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
