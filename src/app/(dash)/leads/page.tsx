'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, waLink, formatRupiah } from '@/contracts'
import { api, getToken } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  PageHeader, Spinner, Empty, Button, Modal, Field, inputCls, selectCls, Alert, fmtDateTime,
} from '@/components/ui'
import { DataGrid, useGridRows, useGridView, type GridField } from '@/components/DataGrid'
import { GridToolbar } from '@/components/GridToolbar'

interface Lead {
  id: string; name: string; phone: string; email?: string | null
  interest?: string | null; message?: string | null
  amount?: number | null; tenorMonths?: number | null; estimatedInstallment?: number | null
  purposes: string[]; source: string; status: string; createdAt: string; contactedAt?: string | null
  productName?: string | null; branchName?: string | null; assignedToName?: string | null
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'grey' | 'red'> = {
  baru: 'green', diproses: 'amber', selesai: 'grey', ditolak: 'red',
}
const SOURCE_LABEL: Record<string, string> = {
  profiling: 'Profiling', contact_form: 'Formulir Kontak', suggestion: 'Saran',
  career: 'Karir', whatsapp: 'WhatsApp', manual: 'Manual',
}

const FIELDS: GridField<Lead>[] = [
  { key: 'name', label: 'Nama', type: 'text', width: 200, readOnly: true, secondary: (r) => r.phone },
  { key: 'phone', label: 'WhatsApp', type: 'text', width: 150, readOnly: true },
  {
    key: 'status', label: 'Status', type: 'select', width: 140,
    options: LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s], tone: STATUS_TONE[s] ?? 'grey' })),
  },
  { key: 'productName', label: 'Produk diminati', type: 'readonly', width: 200, get: (r) => r.productName ?? r.interest ?? '' },
  { key: 'branchName', label: 'Cabang', type: 'readonly', width: 160 },
  { key: 'source', label: 'Sumber', type: 'readonly', width: 140, get: (r) => SOURCE_LABEL[r.source] ?? r.source },
  { key: 'amount', label: 'Nominal', type: 'currency', width: 150, readOnly: true },
  { key: 'tenorMonths', label: 'Tenor', type: 'number', width: 100, readOnly: true },
  { key: 'estimatedInstallment', label: 'Estimasi angsuran', type: 'currency', width: 170, readOnly: true },
  { key: 'assignedToName', label: 'Ditugaskan ke', type: 'readonly', width: 160 },
  { key: 'createdAt', label: 'Masuk', type: 'readonly', width: 180, get: (r) => fmtDateTime(r.createdAt) },
  {
    key: 'wa', label: 'Hubungi', type: 'readonly', width: 120,
    get: () => 'WhatsApp',
    render: (r) => (
      <a
        href={waLink(r.phone, `Halo ${r.name}, saya dari KSP Sari Sedana Bali menindaklanjuti permintaan Anda di website.`)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex h-6 items-center gap-1.5 rounded-full bg-green-600 px-2.5 text-[11.5px] font-semibold text-white hover:bg-green-700"
      >
        <MessageCircle className="size-3" /> WhatsApp
      </a>
    ),
  },
]

function LeadsView() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Lead[]>([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const view = useGridView('leads')
  const params = useSearchParams()
  const deepLinkId = params.get('lead')

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const search = new URLSearchParams({ page: String(page), limit: '50' })
      if (status) search.set('status', status)
      if (q) search.set('q', q)
      const r = await api.get<{ data: Lead[]; meta: typeof meta }>(`/leads?${search}`)
      setRows(r.data)
      setMeta(r.meta)
    } catch (e) {
      toast.error('Gagal memuat calon nasabah', { description: (e as Error).message })
    } finally {
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

  // Sorting stays client-side over the page in view; search and status go to the API.
  const visible = useGridRows(rows, FIELDS, '', view.sort)

  async function setLeadStatus(id: string, next: string) {
    const before = rows.find((r) => r.id === id)?.status
    setRows((list) => list.map((r) => (r.id === id ? { ...r, status: next } : r)))
    try {
      await api.patch(`/leads/${id}`, { status: next })
    } catch (e) {
      setRows((list) => list.map((r) => (r.id === id ? { ...r, status: before ?? r.status } : r)))
      toast.error('Status tidak tersimpan', { description: (e as Error).message })
    }
  }

  async function exportCsv() {
    const res = await fetch(`${api.baseUrl}/v1/leads/export/csv`, {
      credentials: 'include',
      headers: { authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) return toast.error('Gagal mengunduh CSV')
    const url = URL.createObjectURL(await res.blob())
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
        subtitle={`${meta.total} data masuk dari website. Ubah status langsung di tabel, atau buka rekaman untuk catatan tindak lanjut.`}
      />

      <GridToolbar
        fields={FIELDS}
        view={view}
        query={q}
        onQuery={setQ}
        onExport={can('leads:export') ? () => void exportCsv() : undefined}
        extra={
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Saring status" className={`${selectCls} h-8 !w-auto shrink-0 !py-0 text-[12.5px] leading-none`}>
            <option value="">Semua status</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <DataGrid<Lead>
            fields={FIELDS}
            rows={visible}
            rowHeight={view.rowHeight}
            hidden={view.hidden}
            widths={view.widths}
            onWidths={view.setWidths}
            sort={view.sort}
            onSort={view.setSort}
            canWrite={can('leads:update')}
            onEdit={can('leads:update') ? ({ rowId, key, value }) => { if (key === 'status') void setLeadStatus(rowId, String(value)) } : undefined}
            onExpand={setSelected}
            emptyState={
              <Empty
                icon={<Users className="size-5" />}
                title={q || status ? 'Tidak ada yang cocok' : 'Belum ada calon nasabah'}
                body={q || status ? 'Ubah kata pencarian atau saringan status.' : 'Data akan muncul begitu pengunjung mengisi formulir atau menyelesaikan profiling di website.'}
              />
            }
          />

          {meta.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-4 text-[13px]">
              <span className="tnum text-ink-500">Halaman {meta.page} dari {meta.totalPages}</span>
              <span className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => void load(meta.page - 1)}>Sebelumnya</Button>
                <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => void load(meta.page + 1)}>Berikutnya</Button>
              </span>
            </div>
          ) : null}
        </>
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
    <Modal open onClose={onClose} title={lead.name} description={SOURCE_LABEL[lead.source] ?? lead.source}>
      <dl className="grid gap-3 text-[13.5px]">
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
            <div key={String(label)} className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="shrink-0 text-ink-500">{label}</dt>
              <dd className="text-right font-medium text-ink-900">{String(value)}</dd>
            </div>
          ))}
      </dl>

      {can('leads:update') ? (
        <div className="mt-5 grid gap-4 border-t border-line pt-5">
          <Field label="Ubah status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Catatan tindak lanjut" hint="Contoh: sudah dihubungi, minta dihubungi kembali besok.">
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </Field>
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Batal</Button>
            <Button variant="dark" onClick={() => void save()} loading={busy}>Simpan</Button>
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

