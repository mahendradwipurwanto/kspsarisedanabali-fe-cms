'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DEFAULT_HEADER, NAV_MAIN, type HeaderSettings, type MenuItem } from '@/contracts'
import { api } from '@/lib/api'
import { toastSaved, type Refreshable } from '@/lib/saved'
import { useSettings } from '@/lib/use-settings'
import { Card, PageHeader, Spinner, Button, Field, inputCls, Switch } from '@/components/ui'
import { MenuEditor } from '@/components/MenuEditor'

function useMenu(key: string) {
  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    void api.get<{ data: { items: MenuItem[] } }>(`/menus/${key}`).then((r) => setItems(r.data.items ?? [])).catch(() => setItems([]))
  }, [key])
  return {
    items, dirty,
    set: (next: MenuItem[]) => { setItems(next); setDirty(true) },
    save: async (name: string) => {
      const res = await api.put<Refreshable>(`/menus/${key}`, { name, items: items ?? [] })
      setDirty(false)
      return res
    },
  }
}

export default function HeaderSettingsPage() {
  const s = useSettings()
  const menu = useMenu('main')
  const [saving, setSaving] = useState(false)

  if (s.loading || menu.items === null) return <Spinner />

  const header = s.group<HeaderSettings>('header', DEFAULT_HEADER)
  const set = <K extends keyof HeaderSettings>(k: K, v: HeaderSettings[K]) => s.setGroup('header', { ...header, [k]: v })
  const dirty = s.dirty || menu.dirty
  const items = menu.items

  async function saveAll() {
    setSaving(true)
    try {
      const bad = items.filter((i) => !i.label.trim() || !i.href.trim())
      if (bad.length) { toast.warning('Ada item menu yang belum lengkap', { description: 'Setiap item butuh label dan tautan.' }); return }
      // The menu save carries the website's answer; the settings save must not
      // then claim success over it.
      const res = await menu.save('Menu utama')
      await s.save(['header'], 'Header dan menu tersimpan')
      if (res?.refreshed === false) toastSaved(res, 'Header dan menu tersimpan')
    } catch (e) {
      toast.error('Gagal menyimpan menu', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Header & menu"
        subtitle="Bilah atas yang tampil di setiap halaman: menu navigasi, tombol utama, dan pengumuman."
        action={
          <>
            <Button variant="secondary" onClick={() => menu.set(structuredClone(NAV_MAIN as unknown as MenuItem[]))}>Pakai menu bawaan</Button>
            <Button variant="dark" onClick={() => void saveAll()} loading={saving || s.saving} disabled={!dirty}>Simpan perubahan</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Menu navigasi" description="Urutan di sini adalah urutan di website. Item dengan submenu tampil sebagai menu turun.">
            <MenuEditor items={items} onChange={menu.set} />
          </Card>

          <Card title="Tombol & pengumuman">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teks tombol utama" hint="Tombol hijau di kanan header."><input value={header.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} className={inputCls} /></Field>
              <Field label="Tujuan tombol" hint="Tulis “whatsapp” untuk memakai nomor WhatsApp koperasi, atau isi tautan."><input value={header.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} list="ksp-routes" className={`${inputCls} mono`} /></Field>
              <Field label="Teks pintasan cari produk"><input value={header.profilingLabel} onChange={(e) => set('profilingLabel', e.target.value)} className={inputCls} /></Field>
              <div className="sm:pt-6">
                <Switch checked={header.showProfilingShortcut} onChange={(v) => set('showProfilingShortcut', v)} label="Tampilkan pintasan cari produk" hint="Tautan kecil di sebelah tombol utama pada layar lebar." />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Field label="Pengumuman" hint="Baris tipis di atas header. Kosongkan untuk menyembunyikan."><input value={header.announcement} onChange={(e) => set('announcement', e.target.value)} placeholder="Contoh: Kantor tutup pada Hari Raya Nyepi, 29 Maret." className={inputCls} /></Field>
              <Field label="Tautan pengumuman" hint="Opsional."><input value={header.announcementHref} onChange={(e) => set('announcementHref', e.target.value)} list="ksp-routes" className={`${inputCls} mono`} /></Field>
            </div>
          </Card>
        </div>

        <div className="h-fit min-w-0 xl:sticky xl:top-20">
          <Card title="Pratinjau" description="Skema, bukan tampilan piksel.">
            <div className="overflow-hidden rounded-[var(--radius-tile)] border border-line">
              {header.announcement ? <div className="truncate bg-ink-900 px-3 py-1.5 text-center text-[10.5px] text-white/80">{header.announcement}</div> : null}
              <div className="flex items-center gap-2 bg-white px-3 py-2.5">
                <span className="size-5 rounded-[4px] bg-green-600" />
                <span className="text-[10.5px] font-bold text-ink-900">KSP</span>
                <span className="ml-2 flex min-w-0 flex-1 gap-2 overflow-hidden">
                  {items.map((i, k) => <span key={k} className="shrink-0 text-[9.5px] font-medium text-ink-600">{i.label || '…'}{i.children?.length ? ' ▾' : ''}</span>)}
                </span>
                {header.showProfilingShortcut ? <span className="hidden shrink-0 text-[9px] text-ink-500 sm:inline">{header.profilingLabel}</span> : null}
                <span className="shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-[9px] font-bold text-white">{header.ctaLabel || 'Tombol'}</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">Untuk melihat hasil sebenarnya, simpan lalu buka website.</p>
          </Card>
        </div>
      </div>
    </>
  )
}
