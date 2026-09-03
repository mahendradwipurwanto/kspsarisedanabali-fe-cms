'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, waLink, formatRupiah } from '@/contracts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Empty, Button, Modal, Field, inputCls, selectCls, Alert, fmtDateTime } from '@/components/ui'

interface Lead {
  id: string; name: string; phone: string; email?: string | null
  interest?: string | null; message?: string | null
  amount?: number | null; tenorMonths?: number | null; estimatedInstallment?: number | null
  purposes: string[]; source: string; status: string; createdAt: string; contactedAt?: string | null
  productName?: string | null; branchName?: string | null; assignedToName?: string | null
}

const TONE: Record<string, 'green' | 'amber' | 'grey' | 'red'> = { baru: 'green', diproses: 'amber', selesai: 'grey', ditolak: 'red' }
const SOURCE_LABEL: Record<string, string> = {
  profiling: 'Profiling', contact_form: 'Formulir Kontak', suggestion: 'Saran', career: 'Karir', whatsapp: 'WhatsApp', manual: 'Manual',
}

function LeadsView() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Lead[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const params = useSearchParams()
  const deepLinkId = params.get('lead')

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (status) params.set('status', status)
      if (q) params.set('q', q)
      const r = await api.get<{ data: Lead[]; meta: typeof meta }>(`/leads?${params}`)
      setRows(r.data)
      setMeta(r.meta)
    } catch { /* handled by the api layer */ } finally {
      setLoading(false)
    }
  }, [status, q])

  useEffect(() => { void load(1) }, [load])

  // Opened from the dashboard's "calon nasabah terbaru" list.
  useEffect(() => {
    if (!deepLinkId || selected) return
    const match = rows.find((r) => r.id === deepLinkId)
    if (match) setSelected(match)
  }, [deepLinkId, rows, selected])

  async function exportCsv() {
    const res = await fetch(`${api.baseUrl}/v1/leads/export/csv`, {
      credentials: 'include',
      headers: { authorization: `Bearer ${(await import('@/lib/api')).getToken() ?? ''}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calon-nasabah-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Calon Nasabah"
        subtitle={`${meta.total} data masuk dari website.`}
        action={can('leads:export') ? <Button variant="secondary" onClick={() => void exportCsv()}>Unduh Excel (CSV)</Button> : undefined}
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp…"
            className={`${inputCls} max-w-xs`}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} max-w-[200px]`}>
            <option value="">Semua status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : rows.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-[12px] font-semibold text-ink-500">
                <tr>
                  <th className="px-5 py-3">Nama & Produk</th>
                  <th className="px-5 py-3">Cabang</th>
                  <th className="px-5 py-3">Sumber</th>
                  <th className="px-5 py-3">Masuk</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((lead) => (
                  <tr key={lead.id} className="hover:bg-paper">
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelected(lead)} className="text-left">
                        <span className="block font-semibold text-ink-900 hover:text-brand-700">{lead.name}</span>
                        <span className="block text-xs text-ink-500">{lead.productName ?? lead.interest ?? '—'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{lead.branchName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-ink-600">{SOURCE_LABEL[lead.source] ?? lead.source}</td>
                    <td className="px-5 py-3.5 text-xs text-ink-500">{fmtDateTime(lead.createdAt)}</td>
                    <td className="px-5 py-3.5"><Pill tone={TONE[lead.status] ?? 'grey'}>{LEAD_STATUS_LABELS[lead.status as never] ?? lead.status}</Pill></td>
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={waLink(lead.phone, `Halo ${lead.name}, saya dari KSP Sari Sedana Bali menindaklanjuti permintaan Anda di website.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3 text-sm">
              <span className="text-ink-500">Halaman {meta.page} dari {meta.totalPages}</span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => void load(meta.page - 1)}>Sebelumnya</Button>
                <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => void load(meta.page + 1)}>Berikutnya</Button>
              </span>
            </div>
          ) : null}
        </Card>
      ) : (
        <Empty title="Belum ada calon nasabah" body="Data akan muncul di sini begitu pengunjung mengisi formulir atau menyelesaikan profiling di website." />
      )}

      <LeadDetail lead={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); void load(meta.page) }} />
    </>
  )
}

function LeadDetail({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: () => void }) {
  const { can } = useAuth()
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setStatus(lead?.status ?? ''); setNote(''); setError('') }, [lead])

  if (!lead) return null

  async function save() {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/leads/${lead!.id}`, { status, note: note || undefined })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={lead.name}>
      <dl className="grid gap-3 text-sm">
        {[
          ['WhatsApp', lead.phone],
          ['Email', lead.email],
          ['Produk diminati', lead.productName ?? lead.interest],
          ['Cabang tujuan', lead.branchName],
          ['Nominal', lead.amount ? formatRupiah(lead.amount) : null],
          ['Jangka waktu', lead.tenorMonths ? `${lead.tenorMonths} bulan` : null],
          ['Estimasi angsuran', lead.estimatedInstallment ? `± ${formatRupiah(lead.estimatedInstallment)}` : null],
          ['Keperluan', lead.purposes.length ? lead.purposes.join(', ').replace(/_/g, ' ') : null],
          ['Pesan', lead.message],
          ['Masuk', fmtDateTime(lead.createdAt)],
          ['Ditugaskan ke', lead.assignedToName],
        ]
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-4 border-b border-ink-100 pb-2">
              <dt className="shrink-0 text-ink-500">{label}</dt>
              <dd className="text-right font-medium text-ink-900">{String(value)}</dd>
            </div>
          ))}
      </dl>

      {can('leads:update') ? (
        <div className="mt-5 grid gap-4 border-t border-ink-200 pt-5">
          <Field label="Ubah status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Catatan tindak lanjut" hint="Contoh: sudah dihubungi, minta dihubungi kembali besok.">
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </Field>
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Batal</Button>
            <Button onClick={() => void save()} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

/** useSearchParams needs a Suspense boundary to keep the route statically shell-rendered. */
export default function LeadsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LeadsView />
    </Suspense>
  )
}
