'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Pencil, ExternalLink, PanelTop, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Empty, Button, Modal, Field, inputCls, Alert, fmtRelative, Badge } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { buildColumns, defaultHidden, fieldText, type TableField } from '@/components/fields'

interface Row {
  id: string; title: string; slug: string; status: string; isSystem: boolean
  updatedAt: string; updatedByName?: string | null; blockCount: number
}

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3000'
const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  published: { label: 'Terbit', variant: 'success' },
  review: { label: 'Menunggu review', variant: 'warning' },
  draft: { label: 'Draf', variant: 'secondary' },
}

const FIELDS: TableField<Row>[] = [
  { key: 'title', label: 'Judul halaman', type: 'text', secondary: (r) => `/${r.slug === '/' ? '' : r.slug}` },
  {
    key: 'status', label: 'Status', type: 'readonly', width: 150,
    get: (r) => STATUS[r.status]?.label ?? r.status,
    render: (r) => <Badge variant={STATUS[r.status]?.variant ?? 'secondary'}>{STATUS[r.status]?.label ?? r.status}</Badge>,
  },
  {
    key: 'kind', label: 'Jenis', type: 'readonly', width: 130,
    get: (r) => (r.isSystem ? 'Halaman sistem' : 'Halaman statis'),
    render: (r) => <Badge variant={r.isSystem ? 'outline' : 'secondary'}>{r.isSystem ? 'Sistem' : 'Statis'}</Badge>,
  },
  { key: 'blockCount', label: 'Blok', type: 'number', width: 90 },
  { key: 'updatedAt', label: 'Terakhir diubah', type: 'readonly', width: 170, get: (r) => fmtRelative(r.updatedAt) },
  { key: 'updatedByName', label: 'Oleh', type: 'readonly', width: 150 },
  { key: 'slug', label: 'Alamat', type: 'readonly', hiddenByDefault: true, get: (r) => `/${r.slug === '/' ? '' : r.slug}` },
]

export default function PagesList() {
  const { can } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: Row[] }>('/pages?limit=200')
      setRows(r.data)
    } catch (e) {
      toast.error('Gagal memuat halaman', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const open = useCallback((row: Row) => router.push(`/halaman/${row.id}`), [router])

  const remove = useCallback(async (row: Row) => {
    if (row.isSystem) return toast.warning('Halaman sistem tidak bisa dihapus')
    if (!window.confirm(`Hapus halaman “${row.title}”? Tautan ke halaman ini akan mati.`)) return
    try {
      await api.del(`/pages/${row.id}`)
      setRows((list) => list.filter((r) => r.id !== row.id))
      toast.success('Halaman dihapus')
    } catch (e) {
      toast.error('Gagal menghapus halaman', { description: (e as Error).message })
    }
  }, [])

  const columns = useMemo(
    () => buildColumns<Row>({
      fields: FIELDS,
      canWrite: can('pages:update'),
      selectable: false,
      onEdit: open,
      editLabel: 'Buka editor',
      extraActions: [
        {
          label: 'Lihat di website',
          icon: <ExternalLink className="size-3.5" />,
          onSelect: (row) => window.open(`${LP}/${row.slug === '/' ? '' : row.slug}`, '_blank', 'noopener'),
        },
        {
          label: 'Salin alamat',
          icon: <Copy className="size-3.5" />,
          onSelect: (row) => {
            void navigator.clipboard?.writeText(`/${row.slug === '/' ? '' : row.slug}`)
            toast.success('Alamat halaman disalin')
          },
        },
        // A system page backs a route the site links to, so it can be edited
        // but never deleted: the action is not offered on those rows.
        ...(can('pages:delete')
          ? [{
              label: 'Hapus halaman',
              icon: <Trash2 className="size-3.5" />,
              variant: 'destructive' as const,
              hidden: (row: Row) => row.isSystem,
              onSelect: (row: Row) => void remove(row),
            }]
          : []),
      ],
    }),
    [can, open, remove],
  )

  return (
    <>
      <PageHeader
        title="Halaman"
        subtitle="Halaman sistem dan halaman statis yang Anda buat sendiri. Buka editor untuk menyusun isinya blok demi blok."
        action={
          <Button variant="secondary" asChild>
            <Link href="/pengaturan/header"><PanelTop className="size-4" /> Atur menu navigasi</Link>
          </Button>
        }
      />

      <DataTable<Row>
        columns={columns}
        data={rows}
        loading={loading}
        storageKey="halaman"
        initialVisibility={defaultHidden(FIELDS)}
        searchPlaceholder="Cari judul atau alamat…"
        globalFilterFn={(row, _id, value) => {
          const q = String(value).toLowerCase()
          return FIELDS.some((f) => fieldText(row.original, f).toLowerCase().includes(q))
        }}
        canWrite={can('pages:create')}
        onCreate={() => setCreating(true)}
        createLabel="Halaman baru"
        onRowClick={open}
        emptyState={
          <Empty
            icon={<FileText className="size-5" />}
            title="Belum ada halaman"
            body="Buat halaman statis seperti Syarat Keanggotaan atau Kebijakan Privasi, lalu tambahkan ke menu navigasi."
            action={can('pages:create') ? <Button variant="dark" onClick={() => setCreating(true)}>Halaman baru</Button> : undefined}
          />
        }
      />

      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-500">
        <Pencil className="size-3.5 text-ink-400" aria-hidden="true" />
        Halaman sistem bisa diubah tetapi tidak bisa dihapus. Halaman baru tidak otomatis muncul di menu.
        <Link href="/pengaturan/header" className="font-semibold text-green-700 hover:underline">Tambahkan ke menu navigasi</Link>
        agar pengunjung menemukannya.
      </p>

      {creating ? <NewPage onClose={() => setCreating(false)} onCreated={(id) => router.push(`/halaman/${id}`)} /> : null}
    </>
  )
}

/** Title and address only: the blocks are chosen in the editor that opens next. */
function NewPage({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const suggest = (v: string) =>
    v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  async function create() {
    setBusy(true)
    setError('')
    try {
      const r = await api.post<{ data: { id: string } }>('/pages', {
        title: title.trim(),
        slug: (slug || suggest(title)).trim(),
        status: 'draft',
        seo: {},
        blocks: [],
      })
      toast.success('Halaman dibuat sebagai draf')
      onCreated(r.data.id)
    } catch (err) {
      const e = err as ApiError
      setError(Array.isArray(e.details) ? e.details.map((d) => `${d.field}: ${d.message}`).join(' · ') : e.message)
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Halaman baru"
      description="Beri judul dan alamat. Isi halaman disusun di editor berikutnya."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant="dark" onClick={() => void create()} loading={busy} disabled={!title.trim()}>Buat halaman</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Judul halaman" required>
          <input
            autoFocus
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(suggest(e.target.value)) }}
            className={inputCls}
            placeholder="Contoh: Syarat Keanggotaan"
          />
        </Field>
        <Field label="Alamat halaman (slug)" hint="Huruf kecil dan tanda hubung saja. Halaman akan terbuka di /alamat-ini.">
          <input value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value) }} className={`${inputCls} mono`} placeholder="syarat-keanggotaan" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
      </div>
    </Modal>
  )
}
