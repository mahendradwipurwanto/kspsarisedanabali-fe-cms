'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, MessageCircle, PhoneCall } from 'lucide-react'
import { toast } from 'sonner'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, waLink, formatRupiah } from '@/contracts'
import { api, getToken } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Spinner, Empty, Button, Modal, Field, inputCls, selectCls, Alert, fmtDateTime } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { buildColumns, defaultHidden, fieldText, type TableField } from '@/components/fields'
import { cn } from '@/lib/utils'

interface Lead {
  id: string; name: string; phone: string; email?: string | null
  interest?: string | null; message?: string | null
  amount?: number | null; tenorMonths?: number | null; estimatedInstallment?: number | null
  purposes: string[]; source: string; status: string; createdAt: string; contactedAt?: string | null
  productName?: string | null; branchName?: string | null; assignedToName?: string | null
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  baru: 'success', diproses: 'warning', selesai: 'secondary', ditolak: 'destructive',
}
const SOURCE_LABEL: Record<string, string> = {
  profiling: 'Profiling', contact_form: 'Formulir Kontak', suggestion: 'Saran',
  career: 'Karir', whatsapp: 'WhatsApp', manual: 'Manual',
}

const FIELDS: TableField<Lead>[] = [
  { key: 'name', label: 'Nama', type: 'text', secondary: (r) => r.phone },
  {
    key: 'status', label: 'Status', type: 'select', width: 130,
    options: LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s], variant: STATUS_VARIANT[s] ?? 'secondary' })),
  },
  { key: 'productName', label: 'Produk diminati', type: 'readonly', get: (r) => r.productName ?? r.interest ?? '' },
  { key: 'branchName', label: 'Cabang', type: 'readonly' },
  { key: 'source', label: 'Sumber', type: 'readonly', width: 140, get: (r) => SOURCE_LABEL[r.source] ?? r.source },
  { key: 'amount', label: 'Nominal', type: 'currency', width: 140 },
  { key: 'tenorMonths', label: 'Tenor', type: 'number', width: 90, hiddenByDefault: true },
  { key: 'estimatedInstallment', label: 'Estimasi angsuran', type: 'currency', width: 160, hiddenByDefault: true },
  { key: 'assignedToName', label: 'Ditugaskan ke', type: 'readonly', hiddenByDefault: true },
  { key: 'createdAt', label: 'Masuk', type: 'readonly', width: 170, get: (r) => fmtDateTime(r.createdAt) },
  { key: 'phone', label: 'WhatsApp', type: 'text', hiddenByDefault: true },
]

function LeadsView() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const params = useSearchParams()
  const deepLinkId = params.get('lead')

  // The status filter runs on the server; search, sort and paging run here over
  // the loaded page, which keeps the table instant for the volumes this gets.
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const search = new URLSearchParams({ page: '1', limit: '500' })
      if (status) search.set('status', status)
      const r = await api.get<{ data: Lead[]; meta: { total: number } }>(`/leads?${search}`)
      setRows(r.data)
      setTotal(r.meta.total)
    } catch (e) {
      toast.error('Gagal memuat calon nasabah', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!deepLinkId || selected) return
    const match = rows.find((r) => r.id === deepLinkId)
    if (match) setSelected(match)
  }, [deepLinkId, rows, selected])

  const columns = useMemo(
    () => buildColumns<Lead>({
      fields: FIELDS,
      selectable: false,
      canWrite: can('leads:update'),
      onEdit: setSelected,
      editLabel: 'Tindak lanjuti',
      extraActions: [
        {
          label: 'Buka WhatsApp',
          icon: <MessageCircle className="size-3.5" />,
          onSelect: (row) => window.open(waLink(row.phone, `Halo ${row.name}, saya dari KSP Sari Sedana Bali menindaklanjuti permintaan Anda di website.`), '_blank', 'noopener'),
        },
        { label: 'Telepon', icon: <PhoneCall className="size-3.5" />, onSelect: (row) => { window.location.href = `tel:${row.phone}` } },
      ],
    }),
    [can],
  )

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
        subtitle={`${total} data masuk dari website.${rows.length < total ? ` Menampilkan ${rows.length} terbaru.` : ''}`}
      />

      <DataTable<Lead>
        columns={columns}
        data={rows}
        loading={loading}
        storageKey="leads"
        initialVisibility={defaultHidden(FIELDS)}
        searchPlaceholder="Cari nama, nomor, produk…"
        globalFilter={query}
        onGlobalFilter={setQuery}
        globalFilterFn={(row, _id, value) => {
          const q = String(value).toLowerCase()
          return FIELDS.some((f) => fieldText(row.original, f).toLowerCase().includes(q))
        }}
        onExport={can('leads:export') ? () => void exportCsv() : undefined}
        onRowClick={setSelected}
        toolbar={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Saring status"
            className={cn(selectCls, 'h-9 !w-auto !py-0 text-[13px] leading-none')}
          >
            <option value="">Semua status</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        }
        emptyState={
          <Empty
            icon={<Users className="size-5" />}
            title={query || status ? 'Tidak ada yang cocok' : 'Belum ada calon nasabah'}
            body={query || status ? 'Ubah kata pencarian atau saringan status.' : 'Data akan muncul begitu pengunjung mengisi formulir atau menyelesaikan profiling di website.'}
          />
        }
      />

      <LeadDetail lead={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); void load() }} />
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
      toast.success('Tindak lanjut tersimpan')
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name}
      description={SOURCE_LABEL[lead.source] ?? lead.source}
      footer={
        can('leads:update') ? (
          <>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
            <Button variant="dark" onClick={() => void save()} loading={busy}>Simpan</Button>
          </>
        ) : <Button variant="secondary" onClick={onClose}>Tutup</Button>
      }
    >
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
