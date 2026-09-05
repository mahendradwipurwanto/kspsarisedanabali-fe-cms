'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DEFAULT_FOOTER, DEFAULT_FOOTER_MENU, type FooterSettings, type MenuItem } from '@/contracts'
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

export default function FooterSettingsPage() {
  const s = useSettings()
  const menu = useMenu('footer')
  const [saving, setSaving] = useState(false)

  if (s.loading || menu.items === null) return <Spinner />

  const footer = s.group<FooterSettings>('footer', DEFAULT_FOOTER)
  const set = <K extends keyof FooterSettings>(k: K, v: FooterSettings[K]) => s.setGroup('footer', { ...footer, [k]: v })
  const items = menu.items
  const dirty = s.dirty || menu.dirty

  async function saveAll() {
    setSaving(true)
    try {
      const res = await menu.save('Menu footer')
      await s.save(['footer'], 'Footer tersimpan')
      if (res?.refreshed === false) toastSaved(res, 'Footer tersimpan')
    } catch (e) {
      toast.error('Gagal menyimpan menu footer', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Website"
        title="Footer"
        subtitle="Bagian bawah setiap halaman: ajakan terakhir, kolom tautan, kantor, dan catatan kaki."
        action={
          <>
            <Button variant="secondary" onClick={() => menu.set(DEFAULT_FOOTER_MENU)}>Pakai kolom bawaan</Button>
            <Button variant="dark" onClick={() => void saveAll()} loading={saving || s.saving} disabled={!dirty}>Simpan perubahan</Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-5">
          <Card title="Ajakan di atas footer" description="Bidang hijau yang tampil sebelum footer gelap.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Judul"><input value={footer.ctaHeading} onChange={(e) => set('ctaHeading', e.target.value)} className={inputCls} /></Field>
              <Field label="Kalimat pendukung"><input value={footer.ctaBody} onChange={(e) => set('ctaBody', e.target.value)} className={inputCls} /></Field>
              <Field label="Tombol utama"><input value={footer.primaryLabel} onChange={(e) => set('primaryLabel', e.target.value)} className={inputCls} /></Field>
              <Field label="Tujuan tombol utama"><input value={footer.primaryHref} onChange={(e) => set('primaryHref', e.target.value)} list="ksp-routes" className={`${inputCls} mono`} /></Field>
              <Field label="Tombol kedua"><input value={footer.secondaryLabel} onChange={(e) => set('secondaryLabel', e.target.value)} className={inputCls} /></Field>
              <Field label="Tujuan tombol kedua"><input value={footer.secondaryHref} onChange={(e) => set('secondaryHref', e.target.value)} list="ksp-routes" className={`${inputCls} mono`} /></Field>
            </div>
          </Card>

          <Card title="Kolom tautan" description="Setiap item teratas menjadi judul kolom; submenu-nya menjadi tautan di kolom itu.">
            <MenuEditor items={items} onChange={menu.set} childLabel="tautan" />
          </Card>

          <Card title="Kantor & catatan kaki">
            <div className="grid gap-4">
              <Switch checked={footer.showBranches} onChange={(v) => set('showBranches', v)} label="Tampilkan daftar kantor di footer" hint="Alamat dan telepon tiap kantor, diambil dari menu Kantor." />
              <Field label="Catatan kaki" hint="Tampil di sebelah hak cipta. Kosongkan jika tidak perlu."><input value={footer.bottomNote} onChange={(e) => set('bottomNote', e.target.value)} placeholder="Contoh: Diawasi oleh Dinas Koperasi Kabupaten Karangasem." className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <div className="h-fit min-w-0 xl:sticky xl:top-20">
          <Card title="Pratinjau" description="Skema, bukan tampilan piksel.">
            <div className="overflow-hidden rounded-[var(--radius-tile)] border border-line text-[9.5px]">
              <div className="bg-green-700 px-3 py-2.5 text-white">
                <p className="text-[11px] font-bold">{footer.ctaHeading || 'Judul ajakan'}</p>
                <p className="text-white/70">{footer.ctaBody}</p>
                <p className="mt-1.5 flex gap-1.5"><span className="rounded-full bg-white px-2 py-0.5 font-bold text-green-700">{footer.primaryLabel || '…'}</span><span className="rounded-full border border-white/50 px-2 py-0.5">{footer.secondaryLabel || '…'}</span></p>
              </div>
              <div className="grid-dark grid gap-3 bg-ink-900 p-3 text-white/70" style={{ gridTemplateColumns: `1.2fr repeat(${Math.max(1, items.length)}, 1fr)` }}>
                <div><p className="font-bold text-white">KSP</p><p className="mt-1 text-white/45">deskripsi</p></div>
                {items.map((col, i) => (
                  <div key={i}><p className="font-bold text-white">{col.label || '…'}</p>{(col.children ?? []).map((c, k) => <p key={k} className="truncate">{c.label || '…'}</p>)}</div>
                ))}
              </div>
              {footer.showBranches ? <div className="bg-ink-900 px-3 pb-2 text-white/45">▪ kantor ▪ kantor ▪ kantor</div> : null}
              <div className="bg-ink-950 px-3 py-1.5 text-white/40">© {new Date().getFullYear()} · {footer.bottomNote || 'catatan kaki'}</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
