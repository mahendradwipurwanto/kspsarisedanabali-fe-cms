'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquareHeart, Star, Mail, PhoneCall } from 'lucide-react'
import { toast } from 'sonner'
import {
  FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, waLink,
} from '@/contracts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useConfirm } from '@/components/confirm'
import { PageHeader, Spinner, Empty, Button, Modal, Field, inputCls, selectCls, Pill, fmtDateTime } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { buildColumns, defaultHidden, type TableField } from '@/components/fields'

interface Feedback {
  id: string
  category: string
  rating?: number | null
  name?: string | null
  email?: string | null
  phone?: string | null
  subject?: string | null
  message: string
  status: string
  note?: string | null
  createdAt: string
  handledAt?: string | null
  branchName?: string | null
  handledByName?: string | null
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  baru: 'success', dibaca: 'warning', ditindaklanjuti: 'warning', selesai: 'secondary',
}

/** Stars as text so the column stays readable and sorts sensibly. */
const stars = (n?: number | null) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '')

const FIELDS: TableField<Feedback>[] = [
  {
    key: 'subject', label: 'Masukan', type: 'text',
    get: (r) => r.subject || r.message.slice(0, 60),
    secondary: (r) => r.name || 'Tanpa nama',
  },
  {
    key: 'category', label: 'Jenis', type: 'select', width: 130,
    options: FEEDBACK_CATEGORIES.map((c) => ({ value: c, label: FEEDBACK_CATEGORY_LABELS[c], variant: 'secondary' as const })),
  },
  {
    key: 'status', label: 'Status', type: 'select', width: 150,
    options: FEEDBACK_STATUSES.map((s) => ({ value: s, label: FEEDBACK_STATUS_LABELS[s], variant: STATUS_VARIANT[s] ?? 'secondary' })),
  },
  { key: 'rating', label: 'Nilai', type: 'readonly', width: 110, get: (r) => stars(r.rating) },
  { key: 'branchName', label: 'Kantor', type: 'readonly', width: 150 },
  { key: 'createdAt', label: 'Masuk', type: 'readonly', width: 170, get: (r) => fmtDateTime(r.createdAt) },
  { key: 'handledByName', label: 'Ditangani oleh', type: 'readonly', hiddenByDefault: true },
  { key: 'phone', label: 'WhatsApp', type: 'readonly', hiddenByDefault: true },
  { key: 'email', label: 'Email', type: 'readonly', hiddenByDefault: true },
]

export default function FeedbackPage() {
  const { can } = useAuth()
  const confirm = useConfirm()
  const [rows, setRows] = useState<Feedback[]>([])
  const [summary, setSummary] = useState<{ byStatus: Record<string, number>; total: number; averageRating: number | null } | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Feedback | null>(null)

  const canUpdate = can('feedback:update')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        api.get<{ data: Feedback[] }>(`/feedback?limit=100${status ? `&status=${status}` : ''}`),
        api.get<{ data: { byStatus: Record<string, number>; total: number; averageRating: number | null } }>('/feedback/summary'),
      ])
      setRows(list.data)
      setSummary(sum.data)
    } catch (e) {
      toast.error('Gagal memuat masukan', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { void load() }, [load])

  // Opening a new one marks it read, so the "Baru" count means "nobody has
  // looked at this yet" rather than "nobody has finished with it".
  const open = useCallback(async (row: Feedback) => {
    setSelected(row)
    if (row.status === 'baru' && canUpdate) {
      try {
        await api.patch(`/feedback/${row.id}`, { status: 'dibaca' })
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: 'dibaca' } : r)))
        setSummary((s) => (s ? { ...s, byStatus: { ...s.byStatus, baru: Math.max(0, (s.byStatus.baru ?? 1) - 1), dibaca: (s.byStatus.dibaca ?? 0) + 1 } } : s))
      } catch { /* reading is not worth an error toast */ }
    }
  }, [canUpdate])

  const remove = useCallback(async (row: Feedback) => {
    if (!(await confirm({
      title: 'Hapus masukan ini?',
      body: 'Masukan akan hilang dari daftar. Gunakan status “Selesai” bila hanya ingin menandainya sudah ditangani.',
      confirmLabel: 'Hapus masukan',
      tone: 'danger',
    }))) return
    try {
      await api.del(`/feedback/${row.id}`)
      setRows((list) => list.filter((r) => r.id !== row.id))
      setSelected(null)
      toast.success('Masukan dihapus')
    } catch (e) {
      toast.error('Gagal menghapus', { description: (e as Error).message })
    }
  }, [confirm])

  const columns = useMemo(
    () => buildColumns<Feedback>({
      fields: FIELDS,
      selectable: false,
      canWrite: can('feedback:update'),
      onDelete: can('feedback:delete') ? remove : undefined,
    }),
    [can, remove],
  )

  if (loading && !rows.length) return <Spinner />

  const counts = summary?.byStatus ?? {}

  return (
    <>
      <PageHeader
        eyebrow="Ikhtisar"
        title="Kritik & saran"
        subtitle="Masukan yang dikirim pengunjung lewat kotak saran di website. Dibaca pengurus dan ditindaklanjuti di sini."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<MessageSquareHeart className="size-4" />} label="Total masukan" value={String(summary?.total ?? 0)} />
        <Stat icon={<MessageSquareHeart className="size-4" />} label="Belum dibaca" value={String(counts.baru ?? 0)} tone={counts.baru ? 'alert' : 'plain'} />
        <Stat icon={<MessageSquareHeart className="size-4" />} label="Sedang ditindaklanjuti" value={String(counts.ditindaklanjuti ?? 0)} />
        <Stat icon={<Star className="size-4" />} label="Rata-rata penilaian" value={summary?.averageRating != null ? `${summary.averageRating} / 5` : '—'} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-ink-600">Saring status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} !h-9 !w-auto !py-0 text-[13px]`} aria-label="Saring status">
          <option value="">Semua status</option>
          {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}{counts[s] ? ` (${counts[s]})` : ''}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty
          icon={<MessageSquareHeart className="size-5" />}
          title="Belum ada masukan"
          body="Masukan akan muncul di sini begitu pengunjung mengirim lewat blok “Formulir Kritik & Saran” di salah satu halaman website."
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          storageKey="masukan"
          onRowClick={open}
          searchPlaceholder="Cari isi masukan, judul, atau nama…"
          initialVisibility={defaultHidden(FIELDS)}
        />
      )}

      <DetailSheet
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

function Stat({ icon, label, value, tone = 'plain' }: { icon: React.ReactNode; label: string; value: string; tone?: 'plain' | 'alert' }) {
  return (
    <div className={`surface flex items-center gap-3 p-4 ${tone === 'alert' ? 'ring-1 ring-inset ring-gold-300' : ''}`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-tile)] ${tone === 'alert' ? 'bg-gold-50 text-gold-700' : 'bg-paper text-ink-500'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11.5px] text-ink-400">{label}</span>
        <span className="tnum block text-[18px] font-bold text-ink-900">{value}</span>
      </span>
    </div>
  )
}

/** The whole message, plus the two things staff do with it: status and a note. */
function DetailSheet({
  row, canUpdate, onClose, onSaved,
}: {
  row: Feedback | null
  canUpdate: boolean
  onClose: () => void
  onSaved: (next: Feedback) => void
}) {
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setStatus(row?.status ?? '')
    setNote(row?.note ?? '')
  }, [row])

  if (!row) return null

  async function save() {
    setBusy(true)
    try {
      const res = await api.patch<{ data: Feedback }>(`/feedback/${row!.id}`, { status, note })
      toast.success('Masukan diperbarui')
      onSaved(res.data)
    } catch (e) {
      toast.error('Gagal menyimpan', { description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const wa = row.phone ? waLink(row.phone, `Halo ${row.name || ''}, terima kasih atas masukan Anda untuk KSP Sari Sedana Bali.`) : null

  return (
    <Modal
      open
      onClose={onClose}
      title={row.subject || 'Masukan'}
      description={`${FEEDBACK_CATEGORY_LABELS[row.category as keyof typeof FEEDBACK_CATEGORY_LABELS] ?? row.category} · masuk ${fmtDateTime(row.createdAt)}`}
      size="lg"
      footer={
        canUpdate ? (
          <>
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
            <Button variant="dark" onClick={save} loading={busy}>Simpan</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        )
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={row.status === 'baru' ? 'green' : row.status === 'selesai' ? 'grey' : 'amber'} dot>
            {FEEDBACK_STATUS_LABELS[row.status as keyof typeof FEEDBACK_STATUS_LABELS] ?? row.status}
          </Pill>
          {row.rating ? <Pill tone="grey">{stars(row.rating)} {row.rating}/5</Pill> : null}
          {row.branchName ? <Pill tone="grey">{row.branchName}</Pill> : null}
          {row.handledByName ? <Pill tone="grey">Ditangani {row.handledByName}</Pill> : null}
        </div>

        <blockquote className="whitespace-pre-wrap rounded-[var(--radius-input)] border border-line bg-paper px-4 py-3.5 text-[14px] leading-relaxed text-ink-800">
          {row.message}
        </blockquote>

        <div className="grid gap-2 text-[13px] text-ink-600 sm:grid-cols-2">
          <span><span className="text-ink-400">Nama:</span> {row.name || <em className="text-ink-400">tanpa nama</em>}</span>
          <span><span className="text-ink-400">Kantor:</span> {row.branchName || '—'}</span>
          <span className="flex items-center gap-1.5">
            <PhoneCall className="size-3.5 text-ink-400" />
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-700 underline-offset-4 hover:underline">{row.phone}</a> : '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5 text-ink-400" />
            {row.email ? <a href={`mailto:${row.email}`} className="font-semibold text-green-700 underline-offset-4 hover:underline">{row.email}</a> : '—'}
          </span>
        </div>

        {canUpdate ? (
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Catatan internal" hint="Tidak terlihat oleh pengirim.">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Tindak lanjut yang sudah dilakukan…" />
            </Field>
          </div>
        ) : row.note ? (
          <div className="border-t border-line pt-4">
            <p className="text-[12px] text-ink-400">Catatan internal</p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-ink-700">{row.note}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
