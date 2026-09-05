'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Empty, Button, Pill } from './ui'
import { DataTable } from './DataTable'
import { RecordSheet, recordValues } from './RecordSheet'
import { buildColumns, csvFromRows, defaultHidden, fieldText, type FieldOption, type TableField } from './fields'

/**
 * Shared table screen for the flat content types (produk, berita, kantor, …).
 *
 * One field list drives the columns and the record form, so a field added here
 * appears in both. The table reads; the sheet writes.
 */
export function ResourceList<T extends { id: string }>({
  title, subtitle, endpoint, viewKey, fields: rawFields, writePermission, emptyBody, emptyIcon,
  transformOut, canCreate = true, canDelete = true, recordTitle, panelNote, headerAction,
}: {
  title: string
  subtitle: string
  endpoint: string
  /** localStorage key for column visibility. */
  viewKey: string
  fields: TableField<T>[]
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
  const [record, setRecord] = useState<{ row: T | null; values: Record<string, unknown> } | null>(null)
  const [saving, setSaving] = useState(false)
  const [sheetError, setSheetError] = useState('')

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

  // Fields that point at another collection get their options from it. Loaded
  // once per screen; a failure leaves the select empty rather than the screen
  // broken, and the record still saves without that field.
  const [linked, setLinked] = useState<Record<string, FieldOption[]>>({})
  const linkedKey = rawFields.filter((f) => f.optionsEndpoint).map((f) => `${f.key}:${f.optionsEndpoint}`).join('|')

  useEffect(() => {
    if (!linkedKey) return
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        linkedKey.split('|').map(async (pair) => {
          const [key, endpoint] = [pair.slice(0, pair.indexOf(':')), pair.slice(pair.indexOf(':') + 1)]
          try {
            const r = await api.get<{ data: Record<string, unknown>[] }>(`${endpoint}?limit=200`)
            return [key, r.data.map((o) => ({ value: String(o.id), label: String(o.name ?? o.title ?? o.id) }))] as const
          } catch {
            return [key, [] as FieldOption[]] as const
          }
        }),
      )
      if (!cancelled) setLinked(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [linkedKey])

  const fields = useMemo(
    () => rawFields.map((f) => (f.optionsEndpoint ? { ...f, options: [...(f.emptyOption ? [f.emptyOption] : []), ...(linked[f.key] ?? [])] } : f)),
    [rawFields, linked],
  )

  const openNew = useCallback(() => { setSheetError(''); setRecord({ row: null, values: recordValues(fields, null) }) }, [fields])
  const openRow = useCallback((row: T) => { setSheetError(''); setRecord({ row, values: recordValues(fields, row) }) }, [fields])

  const removeRow = useCallback(async (row: T) => {
    if (!window.confirm(`Hapus ${recordTitle?.(row) ?? 'data ini'}? Tindakan ini tidak bisa dibatalkan.`)) return
    try {
      await api.del(`${endpoint}/${row.id}`)
      setRows((list) => list.filter((r) => r.id !== row.id))
      toast.success('Data dihapus')
    } catch (e) {
      toast.error('Gagal menghapus', { description: (e as Error).message })
    }
  }, [endpoint, recordTitle])

  const columns = useMemo(
    () => buildColumns<T>({
      fields,
      canWrite,
      onEdit: openRow,
      onDelete: canWrite && canDelete ? (row) => void removeRow(row) : undefined,
      editLabel: canWrite ? 'Ubah' : 'Lihat',
    }),
    [fields, canWrite, canDelete, openRow, removeRow],
  )

  async function save() {
    if (!record) return
    setSaving(true)
    setSheetError('')
    try {
      const cleaned = Object.fromEntries(
        Object.entries(record.values).filter(([, v]) => v !== undefined && v !== null),
      )
      const payload = transformOut ? transformOut(cleaned) : cleaned
      if (record.row) await api.patch(`${endpoint}/${record.row.id}`, payload)
      else await api.post(endpoint, payload)
      setRecord(null)
      await load()
      toast.success(record.row ? 'Perubahan tersimpan' : `${title} baru ditambahkan`)
    } catch (err) {
      const e = err as ApiError
      const detail = Array.isArray(e.details) ? e.details.map((d) => `${d.field}: ${d.message}`).join(' · ') : undefined
      setSheetError(detail ?? e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMany(selected: T[]) {
    if (!window.confirm(`Hapus ${selected.length} data terpilih? Tindakan ini tidak bisa dibatalkan.`)) return
    const results = await Promise.allSettled(selected.map((row) => api.del(`${endpoint}/${row.id}`)))
    const failed = results.filter((r) => r.status === 'rejected').length
    await load()
    if (failed) toast.error(`${failed} data gagal dihapus`)
    else toast.success(`${selected.length} data dihapus`)
  }

  function exportCsv() {
    const csv = csvFromRows(rows, fields.filter((f) => !f.panelOnly))
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${viewKey}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} action={headerAction} />

      <DataTable<T>
        columns={columns}
        data={rows}
        loading={loading}
        storageKey={viewKey}
        initialVisibility={defaultHidden(fields)}
        searchPlaceholder={`Cari ${title.toLowerCase()}…`}
        globalFilterFn={(row, _id, value) => {
          const q = String(value).toLowerCase()
          return fields.some((f) => fieldText(row.original, f).toLowerCase().includes(q))
        }}
        canWrite={canWrite}
        onCreate={canCreate ? openNew : undefined}
        createLabel={`${title} baru`}
        onDeleteMany={canWrite && canDelete ? deleteMany : undefined}
        onExport={rows.length ? exportCsv : undefined}
        onRowClick={openRow}
        emptyState={
          <Empty
            icon={emptyIcon}
            title={`Belum ada ${title.toLowerCase()}`}
            body={emptyBody}
            action={canWrite && canCreate ? <Button variant="dark" onClick={openNew}>Tambah {title.toLowerCase()}</Button> : undefined}
          />
        }
      />

      <RecordSheet<T>
        open={record !== null}
        onOpenChange={(open) => { if (!open) setRecord(null) }}
        fields={fields}
        values={record?.values ?? {}}
        onChange={(values) => setRecord((r) => (r ? { ...r, values } : r))}
        onSave={() => void save()}
        onDelete={canWrite && canDelete && record?.row ? () => { const row = record.row!; setRecord(null); void removeRow(row) } : undefined}
        title={record?.row ? (recordTitle?.(record.row) ?? `Ubah ${title.toLowerCase()}`) : `${title} baru`}
        subtitle={record?.row ? `id ${record.row.id}` : undefined}
        busy={saving}
        canWrite={canWrite}
        error={sheetError}
        note={panelNote}
      />
    </>
  )
}

export { Pill }
export type { TableField }
