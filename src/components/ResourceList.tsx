'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Spinner, Empty, Button, Pill } from './ui'
import { DataGrid, useGridRows, useGridView, gridCsv, type GridEdit, type GridField } from './DataGrid'
import { GridToolbar, RecordPanel, panelValues } from './GridToolbar'

/**
 * Shared table screen for the flat content types (produk, berita, kantor, …).
 *
 * One field list drives everything: the grid columns, the cell editors, and the
 * expanded record. Add a field here and it appears in all three, so the two
 * cannot drift apart the way a separate table and modal always do.
 */
export function ResourceList<T extends { id: string }>({
  title, subtitle, endpoint, viewKey, fields, writePermission, emptyBody, emptyIcon,
  transformOut, canCreate = true, canDelete = true, recordTitle, panelNote, headerAction,
}: {
  title: string
  subtitle: string
  endpoint: string
  /** localStorage key for column widths and hidden fields. */
  viewKey: string
  fields: GridField<T>[]
  writePermission: string
  emptyBody: string
  emptyIcon?: ReactNode
  transformOut?: (values: Record<string, unknown>) => Record<string, unknown>
  canCreate?: boolean
  canDelete?: boolean
  recordTitle?: (row: T) => string
  panelNote?: ReactNode
  headerAction?: ReactNode
}) {
  const { can } = useAuth()
  const canWrite = can(writePermission)

  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const view = useGridView(viewKey)

  const [record, setRecord] = useState<{ row: T | null; values: Record<string, unknown> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: T[] }>(`${endpoint}?limit=200`)
      setRows(r.data)
    } catch (e) {
      toast.error(`Gagal memuat ${title.toLowerCase()}`, { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [endpoint, title])

  useEffect(() => { void load() }, [load])

  const visible = useGridRows(rows, fields, query, view.sort)

  /** Inline cell edit: apply at once, put the old value back if the API says no. */
  async function onEdit({ rowId, key, value }: GridEdit) {
    const before = rows.find((r) => r.id === rowId)
    if (!before) return
    const previous = (before as Record<string, unknown>)[key]
    setRows((list) => list.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)))
    try {
      await api.patch(`${endpoint}/${rowId}`, transformOut ? transformOut({ [key]: value }) : { [key]: value })
    } catch (err) {
      setRows((list) => list.map((r) => (r.id === rowId ? { ...r, [key]: previous } : r)))
      const e = err as ApiError
      const detail = Array.isArray(e.details) ? e.details.map((d) => d.message).join(' ') : undefined
      toast.error('Perubahan tidak tersimpan', { description: detail ?? e.message })
    }
  }

  async function saveRecord() {
    if (!record) return
    setSaving(true)
    setPanelError('')
    try {
      const payload = transformOut ? transformOut(record.values) : record.values
      if (record.row) await api.patch(`${endpoint}/${record.row.id}`, payload)
      else await api.post(endpoint, payload)
      setRecord(null)
      await load()
      toast.success(record.row ? 'Perubahan tersimpan' : `${title} baru ditambahkan`)
    } catch (err) {
      const e = err as ApiError
      const detail = Array.isArray(e.details) ? e.details.map((d) => `${d.field}: ${d.message}`).join(' · ') : undefined
      setPanelError(detail ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord() {
    if (!record?.row) return
    if (!window.confirm(`Hapus ${recordTitle?.(record.row) ?? 'data ini'}? Tindakan ini tidak bisa dibatalkan.`)) return
    setSaving(true)
    try {
      await api.del(`${endpoint}/${record.row.id}`)
      setRecord(null)
      await load()
      toast.success('Data dihapus')
    } catch (e) {
      setPanelError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function exportCsv() {
    const csv = gridCsv(visible, fields.filter((f) => !f.panelOnly))
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${viewKey}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openNew = () => { setPanelError(''); setRecord({ row: null, values: panelValues(fields, null) }) }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={headerAction} />

      <GridToolbar
        fields={fields}
        view={view}
        query={query}
        onQuery={setQuery}
        canWrite={canWrite}
        onCreate={canCreate ? openNew : undefined}
        onExport={rows.length ? exportCsv : undefined}
      />

      {loading ? (
        <Spinner />
      ) : (
        <DataGrid<T>
          fields={fields}
          rows={visible}
          rowHeight={view.rowHeight}
          hidden={view.hidden}
          widths={view.widths}
          onWidths={view.setWidths}
          sort={view.sort}
          onSort={view.setSort}
          onEdit={canWrite ? onEdit : undefined}
          onExpand={(row) => { setPanelError(''); setRecord({ row, values: panelValues(fields, row) }) }}
          onCreate={canCreate ? openNew : undefined}
          canWrite={canWrite}
          emptyState={
            query ? (
              <Empty title="Tidak ada yang cocok" body={`Tidak ada baris yang memuat “${query}”.`} action={<Button variant="secondary" onClick={() => setQuery('')}>Hapus pencarian</Button>} />
            ) : (
              <Empty icon={emptyIcon} title={`Belum ada ${title.toLowerCase()}`} body={emptyBody} action={canWrite && canCreate ? <Button variant="dark" onClick={openNew}>Tambah {title.toLowerCase()}</Button> : undefined} />
            )
          }
        />
      )}

      {record ? (
        <RecordPanel<T>
          fields={fields}
          values={record.values}
          onChange={(values) => setRecord({ ...record, values })}
          onSave={() => void saveRecord()}
          onDelete={canDelete && record.row ? () => void deleteRecord() : undefined}
          onClose={() => setRecord(null)}
          title={record.row ? (recordTitle?.(record.row) ?? `Ubah ${title.toLowerCase()}`) : `${title} baru`}
          subtitle={record.row ? `id ${record.row.id}` : undefined}
          busy={saving}
          canWrite={canWrite}
          error={panelError}
          footerNote={panelNote}
        />
      ) : null}
    </>
  )
}

export { Pill }
export type { GridField }
