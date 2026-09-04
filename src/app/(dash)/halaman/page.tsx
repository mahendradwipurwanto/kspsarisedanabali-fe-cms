'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Pill, Spinner, Empty, Button, Modal, Field, inputCls, Alert, fmtRelative } from '@/components/ui'
import { DataGrid, useGridRows, useGridView, type GridField } from '@/components/DataGrid'
import { GridToolbar } from '@/components/GridToolbar'

interface Row {
  id: string; title: string; slug: string; status: string; isSystem: boolean
  updatedAt: string; updatedByName?: string | null; blockCount: number
}

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'grey' }> = {
  published: { label: 'Terbit', tone: 'green' },
  review: { label: 'Menunggu review', tone: 'amber' },
  draft: { label: 'Draf', tone: 'grey' },
}

const FIELDS: GridField<Row>[] = [
  { key: 'title', label: 'Judul halaman', type: 'text', width: 280, secondary: (r) => `/${r.slug === '/' ? '' : r.slug}` },
  {
    key: 'status', label: 'Status', type: 'readonly', width: 150,
    get: (r) => STATUS[r.status]?.label ?? r.status,
    render: (r) => <Pill tone={STATUS[r.status]?.tone ?? 'grey'}>{STATUS[r.status]?.label ?? r.status}</Pill>,
  },
  { key: 'slug', label: 'Alamat', type: 'readonly', width: 200, get: (r) => `/${r.slug === '/' ? '' : r.slug}` },
  { key: 'blockCount', label: 'Blok', type: 'number', width: 90, readOnly: true },
  { key: 'updatedAt', label: 'Terakhir diubah', type: 'readonly', width: 170, get: (r) => fmtRelative(r.updatedAt) },
  { key: 'updatedByName', label: 'Oleh', type: 'readonly', width: 160 },
  { key: 'isSystem', label: 'Halaman sistem', type: 'boolean', width: 140, readOnly: true },
]

export default function PagesList() {
  const { can } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const view = useGridView('halaman')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: Row[] }>('/pages?limit=100')
      setRows(r.data)
    } catch (e) {
      toast.error('Gagal memuat halaman', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = useGridRows(rows, FIELDS, query, view.sort)
  const canWrite = can('pages:update')

  async function renameRow(id: string, title: string) {
    const before = rows.find((r) => r.id === id)?.title
    setRows((list) => list.map((r) => (r.id === id ? { ...r, title } : r)))
    try {
      await api.patch(`/pages/${id}`, { title })
    } catch (e) {
      setRows((list) => list.map((r) => (r.id === id ? { ...r, title: before ?? r.title } : r)))
      toast.error('Judul tidak tersimpan', { description: (e as Error).message })
    }
  }

  return (
    <>
      <PageHeader
        title="Halaman"
        subtitle="Semua halaman website. Buka rekaman untuk menyusun isinya blok demi blok."
      />

      <GridToolbar
        fields={FIELDS}
        view={view}
        query={query}
        onQuery={setQuery}
        canWrite={can('pages:create')}
        createLabel="Halaman baru"
        onCreate={() => setCreating(true)}
      />

      {loading ? (
        <Spinner />
      ) : (
        <DataGrid<Row>
          fields={FIELDS}
          rows={visible}
          rowHeight={view.rowHeight}
          hidden={view.hidden}
          widths={view.widths}
          onWidths={view.setWidths}
          sort={view.sort}
          onSort={view.setSort}
          canWrite={canWrite}
          onEdit={canWrite ? ({ rowId, key, value }) => { if (key === 'title') void renameRow(rowId, String(value)) } : undefined}
          onExpand={(row) => router.push(`/halaman/${row.id}`)}
          primaryHref={(row) => `/halaman/${row.id}`}
          emptyState={
            <Empty
              icon={<FileText className="size-5" />}
              title={query ? 'Tidak ada yang cocok' : 'Belum ada halaman'}
              body={query ? `Tidak ada halaman yang memuat “${query}”.` : 'Halaman utama website akan muncul di sini setelah data awal dimasukkan.'}
            />
          }
        />
      )}

      {creating ? <NewPage onClose={() => setCreating(false)} onCreated={(id) => router.push(`/halaman/${id}`)} /> : null}
    </>
  )
}

/** Title and address only: the blocks are chosen in the editor that opens next. */
function NewPage({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const suggest = (v: string) =>
    v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  async function create() {
    setBusy(true)
    setError('')
    try {
      const r = await api.post<{ data: { id: string } }>('/pages', { title, slug: slug || suggest(title), status: 'draft', seo: {}, blocks: [] })
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
          <input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setSlug(suggest(e.target.value)) }} className={inputCls} placeholder="Contoh: Syarat Keanggotaan" />
        </Field>
        <Field label="Alamat halaman (slug)" hint="Huruf kecil dan tanda hubung saja.">
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${inputCls} mono`} placeholder="syarat-keanggotaan" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
      </div>
    </Modal>
  )
}
