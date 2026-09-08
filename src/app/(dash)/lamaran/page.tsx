'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Briefcase, Download, Mail, PhoneCall, Eye, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  JOB_APPLICATION_STATUSES, JOB_APPLICATION_STATUS_LABELS, waLink,
} from '@/contracts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import {
  PageHeader, Spinner, Empty, Button, Modal, Field, Alert, Pill, selectCls, fmtDate, fmtDateTime,
} from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { buildColumns, defaultHidden, type TableField } from '@/components/fields'

interface Application {
  id: string
  jobId: string
  jobTitle?: string | null
  name: string
  email: string
  phone: string
  bio?: string | null
  status: string
  createdAt: string
  /** When the retention job deletes the CV and the record with it. */
  purgeAfter?: string | null
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  baru: 'success', ditinjau: 'warning', dipanggil: 'warning', diterima: 'secondary', ditolak: 'destructive',
}

const FIELDS: TableField<Application>[] = [
  { key: 'name', label: 'Pelamar', type: 'text', width: 240, secondary: (r) => r.phone },
  { key: 'jobTitle', label: 'Melamar untuk', type: 'readonly', width: 220 },
  {
    key: 'status', label: 'Status', type: 'select', width: 170,
    options: JOB_APPLICATION_STATUSES.map((s) => ({ value: s, label: JOB_APPLICATION_STATUS_LABELS[s], variant: STATUS_VARIANT[s] ?? 'secondary' })),
  },
  { key: 'createdAt', label: 'Masuk', type: 'readonly', width: 170, get: (r) => fmtDateTime(r.createdAt) },
  { key: 'email', label: 'Email', type: 'readonly', width: 220, hiddenByDefault: true },
  { key: 'phone', label: 'WhatsApp', type: 'readonly', width: 150, hiddenByDefault: true },
  {
    key: 'purgeAfter', label: 'Dihapus otomatis', type: 'readonly', width: 160, hiddenByDefault: true,
    get: (r) => (r.purgeAfter ? fmtDate(r.purgeAfter) : ''),
  },
]

/**
 * Lamaran kerja.
 *
 * The applications were reaching the database and the dashboard counted them,
 * but nothing in the console could open one — the permission existed and had
 * nowhere to be used, so a CV sat unread behind a number on a card.
 */
export default function ApplicationsPage() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Application[]>([])
  const [summary, setSummary] = useState<{ byStatus: Record<string, number>; total: number } | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Application | null>(null)

  const canUpdate = can('jobs:applications')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        api.get<{ data: Application[] }>(`/jobs/applications?limit=200${status ? `&status=${status}` : ''}`),
        api.get<{ data: { byStatus: Record<string, number>; total: number } }>('/jobs/applications/summary'),
      ])
      setRows(list.data)
      setSummary(sum.data)
    } catch (e) {
      toast.error('Gagal memuat lamaran', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { void load() }, [load])

  const columns = useMemo(
    () => buildColumns<Application>({
      fields: FIELDS,
      selectable: false,
      canWrite: canUpdate,
      extraActions: [
        { label: 'Lihat lamaran', icon: <Eye className="size-3.5" />, onSelect: setSelected },
        {
          label: 'Hubungi lewat WhatsApp',
          icon: <PhoneCall className="size-3.5" />,
          onSelect: (row) => window.open(waLink(row.phone, `Halo ${row.name}, terima kasih telah melamar di KSP Sari Sedana Bali.`), '_blank', 'noopener'),
        },
        { label: 'Kirim email', icon: <Mail className="size-3.5" />, onSelect: (row) => { window.location.href = `mailto:${row.email}` } },
      ],
    }),
    [canUpdate],
  )

  if (loading && !rows.length) return <Spinner />

  const counts = summary?.byStatus ?? {}

  return (
    <>
      <PageHeader
        eyebrow="Karir"
        title="Lamaran Kerja"
        subtitle="Lamaran yang masuk lewat formulir di halaman Karir. CV pelamar adalah data pribadi — unduh hanya bila memang sedang ditinjau."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total lamaran" value={String(summary?.total ?? 0)} />
        <Stat label="Belum ditinjau" value={String(counts.baru ?? 0)} tone={counts.baru ? 'alert' : 'plain'} />
        <Stat label="Dipanggil wawancara" value={String(counts.dipanggil ?? 0)} />
        <Stat label="Diterima" value={String(counts.diterima ?? 0)} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-ink-600">Saring status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} !h-9 !w-auto !py-0 text-[13px]`} aria-label="Saring status">
          <option value="">Semua status</option>
          {JOB_APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{JOB_APPLICATION_STATUS_LABELS[s]}{counts[s] ? ` (${counts[s]})` : ''}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty
          icon={<Briefcase className="size-5" />}
          title={status ? 'Tidak ada lamaran dengan status itu' : 'Belum ada lamaran'}
          body="Lamaran akan muncul di sini begitu ada yang mengisi formulir di halaman Karir."
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          storageKey="lamaran"
          onRowClick={setSelected}
          searchPlaceholder="Cari nama, email, atau posisi…"
          initialVisibility={defaultHidden(FIELDS)}
        />
      )}

      <ApplicationSheet
        row={selected}
        canUpdate={canUpdate}
        onClose={() => setSelected(null)}
        onSaved={(next) => {
          setRows((list) => list.map((r) => (r.id === next.id ? { ...r, ...next } : r)))
          setSelected(null)
          void load()
        }}
      />
    </>
  )
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'alert' }) {
  return (
    <div className={`surface flex items-center gap-3 p-4 ${tone === 'alert' ? 'ring-1 ring-inset ring-gold-300' : ''}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-tile)] ${tone === 'alert' ? 'bg-gold-50 text-gold-700' : 'bg-paper text-ink-500'}`}>
        <Briefcase className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] text-ink-400">{label}</span>
        <span className="tnum block text-[18px] font-bold text-ink-900">{value}</span>
      </span>
    </div>
  )
}

/** One application: who applied, what they wrote, their CV, and where it stands. */
function ApplicationSheet({
  row, canUpdate, onClose, onSaved,
}: {
  row: Application | null
  canUpdate: boolean
  onClose: () => void
  onSaved: (next: Application) => void
}) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [cvBusy, setCvBusy] = useState(false)

  useEffect(() => { setStatus(row?.status ?? '') }, [row])

  if (!row) return null

  /**
   * The CV opens through a signature that expires in five minutes.
   *
   * The file is never proxied the way an image is, and the API records who
   * asked for it: reading somebody's CV is the most sensitive thing this
   * console does, and it should leave a trail.
   */
  async function openCv() {
    setCvBusy(true)
    try {
      const res = await api.get<{ data: { url: string } }>(`/jobs/applications/${row!.id}/cv`)
      window.open(res.data.url, '_blank', 'noopener')
    } catch (e) {
      toast.error('Gagal membuka CV', { description: (e as Error).message })
    } finally {
      setCvBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      const res = await api.patch<{ data: Application }>(`/jobs/applications/${row!.id}`, { status })
      toast.success('Status lamaran diperbarui')
      onSaved(res.data)
    } catch (e) {
      toast.error('Gagal menyimpan', { description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={row.name}
      description={`${row.jobTitle ?? 'Lowongan sudah dihapus'} · masuk ${fmtDateTime(row.createdAt)}`}
      size="lg"
      footer={
        canUpdate ? (
          <>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
            <Button variant="dark" onClick={() => void save()} loading={busy}>Simpan</Button>
          </>
        ) : <Button variant="secondary" onClick={onClose}>Tutup</Button>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={row.status === 'baru' ? 'green' : row.status === 'ditolak' ? 'grey' : 'amber'} dot>
            {JOB_APPLICATION_STATUS_LABELS[row.status as keyof typeof JOB_APPLICATION_STATUS_LABELS] ?? row.status}
          </Pill>
          {row.jobTitle ? <Pill tone="grey">{row.jobTitle}</Pill> : null}
        </div>

        <div className="grid gap-2 text-[13px] text-ink-600 sm:grid-cols-2">
          <span className="flex items-center gap-1.5">
            <PhoneCall className="size-3.5 text-ink-400" />
            <a href={waLink(row.phone, `Halo ${row.name}, terima kasih telah melamar di KSP Sari Sedana Bali.`)} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 underline-offset-4 hover:underline">{row.phone}</a>
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5 text-ink-400" />
            <a href={`mailto:${row.email}`} className="font-semibold text-green-700 underline-offset-4 hover:underline">{row.email}</a>
          </span>
        </div>

        {row.bio ? (
          <blockquote className="whitespace-pre-wrap rounded-[var(--radius-input)] border border-line bg-paper px-4 py-3.5 text-[14px] leading-relaxed text-ink-800">
            {row.bio}
          </blockquote>
        ) : (
          <p className="text-[13px] text-ink-400">Pelamar tidak menulis keterangan tambahan.</p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => void openCv()} loading={cvBusy}>
            <Download className="size-3.5" /> Unduh CV
          </Button>
          <span className="text-[12px] leading-relaxed text-ink-400">
            Tautan berlaku 5 menit dan pengunduhannya tercatat di log aktivitas.
          </span>
        </div>

        {row.purgeAfter ? (
          <Alert tone="info">
            <span className="inline-flex items-center gap-1.5"><ShieldAlert className="size-3.5" aria-hidden="true" /> Dihapus otomatis pada {fmtDate(row.purgeAfter)}.</span>{' '}
            CV dan data pelamar tidak disimpan selamanya. Simpan berkas yang masih dibutuhkan sebelum tanggal tersebut.
          </Alert>
        ) : null}

        {canUpdate ? (
          <Field label="Status lamaran" hint="Dipakai untuk memilah mana yang sudah dibaca dan mana yang menunggu. Tidak terlihat oleh pelamar.">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              {JOB_APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{JOB_APPLICATION_STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
        ) : null}
      </div>
    </Modal>
  )
}
