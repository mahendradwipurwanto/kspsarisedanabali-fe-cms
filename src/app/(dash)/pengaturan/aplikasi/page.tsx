'use client'

import { Copy, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { APP_SMART_LINK, DEFAULT_APPS, type AppSettings } from '@/contracts'
import { useSettings } from '@/lib/use-settings'
import { LP_URL } from '@/lib/site'
import { Card, PageHeader, Spinner, Button, Field, inputCls, Switch } from '@/components/ui'

const isHttps = (v: string) => !v || /^https:\/\//i.test(v)

/**
 * Pengaturan → Aplikasi.
 *
 * The store links live here once, not on every "Unduh Aplikasi" block, so a
 * new release URL is changed in one place. The smart link is the address to
 * print on brochures and QR codes: it reads the phone and opens its own store.
 */
export default function AppSettingsPage() {
  const s = useSettings()
  if (s.loading) return <Spinner />

  const apps = s.group<AppSettings>('apps', DEFAULT_APPS)
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => s.setGroup('apps', { ...apps, [k]: v })
  const smartUrl = `${LP_URL}${APP_SMART_LINK}`

  async function save() {
    const bad = [apps.appStoreUrl, apps.playStoreUrl].filter((u) => !isHttps(u))
    if (bad.length) { toast.warning('Tautan toko harus diawali https://', { description: bad[0] }); return }
    await s.save(['apps'], 'Pengaturan aplikasi tersimpan')
  }

  async function copySmart() {
    try { await navigator.clipboard.writeText(smartUrl); toast.success('Tautan pintar disalin') } catch { toast.error('Tidak bisa menyalin, salin manual dari kotak di atas') }
  }

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Aplikasi"
        subtitle="Tautan toko aplikasi koperasi. Dipakai oleh blok “Unduh Aplikasi” di halaman mana pun, dan oleh tautan pintar yang mengarahkan ponsel ke tokonya sendiri."
        action={<Button variant="dark" onClick={() => void save()} loading={s.saving} disabled={!s.dirty}>Simpan perubahan</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Toko aplikasi" description="Kosongkan toko yang belum tersedia; tombolnya tidak akan tampil di website.">
            <div className="grid gap-4">
              <Field label="Nama aplikasi" hint="Dipakai pada judul halaman tautan pintar.">
                <input value={apps.appName} onChange={(e) => set('appName', e.target.value)} className={inputCls} maxLength={60} />
              </Field>
              <Field label="Tautan App Store (iPhone)" hint="Contoh: https://apps.apple.com/id/app/nama-aplikasi/id1234567890" error={isHttps(apps.appStoreUrl) ? undefined : 'Harus diawali https://'}>
                <input value={apps.appStoreUrl} onChange={(e) => set('appStoreUrl', e.target.value)} className={`${inputCls} mono`} placeholder="https://apps.apple.com/…" inputMode="url" />
              </Field>
              <Field label="Tautan Google Play (Android)" hint="Contoh: https://play.google.com/store/apps/details?id=id.co.sarisedanabali" error={isHttps(apps.playStoreUrl) ? undefined : 'Harus diawali https://'}>
                <input value={apps.playStoreUrl} onChange={(e) => set('playStoreUrl', e.target.value)} className={`${inputCls} mono`} placeholder="https://play.google.com/store/apps/details?id=…" inputMode="url" />
              </Field>
            </div>
          </Card>

          <Card title="Tautan pintar" description="Satu alamat untuk brosur, spanduk, dan kode QR. Ponsel dibaca dan dibawa ke tokonya sendiri.">
            <div className="grid gap-4">
              <Field label="Alamat tautan pintar" hint="iPhone → App Store, Android → Google Play, perangkat lain melihat halaman dengan kedua tombol.">
                <span className="flex gap-2">
                  <input value={smartUrl} readOnly className={`${inputCls} mono flex-1`} onFocus={(e) => e.currentTarget.select()} />
                  <Button type="button" variant="secondary" onClick={() => void copySmart()}><Copy className="size-3.5" /> Salin</Button>
                </span>
              </Field>
              <Switch
                checked={apps.autoRedirect}
                onChange={(v) => set('autoRedirect', v)}
                label="Arahkan ponsel langsung ke toko"
                hint="Bila dimatikan, semua perangkat melihat halaman dengan tombol toko dan memilih sendiri."
              />
              <Field label="Deep link aplikasi (opsional)" hint="Skema atau tautan yang dibuka aplikasi bila sudah terpasang, misalnya sarisedana://beranda. Ponsel mencoba membuka aplikasi dulu, lalu ke toko bila tidak ada.">
                <input value={apps.deepLink} onChange={(e) => set('deepLink', e.target.value)} className={`${inputCls} mono`} placeholder="sarisedana://beranda" />
              </Field>
              <Field label="Catatan di halaman tautan pintar" hint="Tampil untuk pengunjung dari komputer, dan bila toko untuk perangkatnya belum diisi.">
                <textarea rows={2} value={apps.note} onChange={(e) => set('note', e.target.value)} className={inputCls} maxLength={200} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card title="Cara memakainya">
            <ol className="grid gap-3 text-[13px] leading-relaxed text-ink-600">
              <li className="flex gap-3"><span className="mono shrink-0 text-ink-400">1</span><span>Isi tautan toko di sebelah kiri, lalu simpan.</span></li>
              <li className="flex gap-3"><span className="mono shrink-0 text-ink-400">2</span><span>Buka halaman mana pun di <span className="font-semibold text-ink-800">Konten → Halaman</span>, tambahkan blok <span className="font-semibold text-ink-800">Unduh Aplikasi</span>, dan terbitkan.</span></li>
              <li className="flex gap-3"><span className="mono shrink-0 text-ink-400">3</span><span>Untuk brosur atau QR, pakai tautan pintar di atas; tidak perlu dua kode berbeda untuk iPhone dan Android.</span></li>
            </ol>
            <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-input)] border border-line bg-paper px-3 py-2.5 text-[12.5px] text-ink-500">
              <Smartphone className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
              Mesin pencari tidak diarahkan ke toko, jadi halaman tautan pintar tetap terindeks dengan kedua tombolnya.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
