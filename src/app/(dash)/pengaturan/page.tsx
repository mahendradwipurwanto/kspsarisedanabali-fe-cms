'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, PageHeader, Spinner, Button, Field, inputCls, Alert } from '@/components/ui'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'green' | 'red'; text: string } | null>(null)

  useEffect(() => {
    void api.get<{ data: Record<string, Record<string, string>> }>('/settings')
      .then((r) => setSettings(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const site = settings.site ?? {}
  const setSite = (k: string, v: string) => setSettings((s) => ({ ...s, site: { ...site, [k]: v } }))

  async function save() {
    setBusy(true); setMessage(null)
    try {
      await api.put('/settings', { site: settings.site, seoDefaults: settings.seoDefaults, social: settings.social })
      setMessage({ tone: 'green', text: 'Pengaturan tersimpan dan website sudah diperbarui.' })
    } catch (e) { setMessage({ tone: 'red', text: (e as Error).message }) }
    finally { setBusy(false) }
  }

  if (loading) return <Spinner />

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Data yang dipakai di seluruh halaman website — ubah sekali, berlaku di mana-mana."
        action={<Button onClick={() => void save()} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>} />

      {message ? <div className="mb-5"><Alert tone={message.tone}>{message.text}</Alert></div> : null}

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-ink-900">Identitas & Kontak</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama koperasi"><input value={site.name ?? ''} onChange={(e) => setSite('name', e.target.value)} className={inputCls} /></Field>
          <Field label="Nama badan hukum"><input value={site.legalName ?? ''} onChange={(e) => setSite('legalName', e.target.value)} className={inputCls} /></Field>
          <Field label="Email"><input value={site.email ?? ''} onChange={(e) => setSite('email', e.target.value)} className={inputCls} /></Field>
          <Field label="Telepon utama"><input value={site.phone ?? ''} onChange={(e) => setSite('phone', e.target.value)} className={inputCls} /></Field>
          <Field label="Nomor WhatsApp" hint="Dipakai tombol Hubungi Kami di seluruh website."><input value={site.whatsapp ?? ''} onChange={(e) => setSite('whatsapp', e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Deskripsi singkat koperasi" hint="Dipakai sebagai deskripsi default di hasil pencarian Google.">
            <textarea rows={3} value={site.description ?? ''} onChange={(e) => setSite('description', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Card>
    </>
  )
}
