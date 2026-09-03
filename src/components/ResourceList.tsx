'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Spinner, Empty, Button, Modal, Field, inputCls, selectCls, Alert, Pill } from './ui'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export interface EditField {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'list'
  hint?: string
  options?: { value: string; label: string }[]
  required?: boolean
}

/**
 * Shared list + inline editor for the simple content types (produk, berita,
 * kantor, …). The page builder handles anything block-shaped; this covers the
 * flat records so each type does not need its own bespoke screen.
 */
export function ResourceList<T extends { id: string }>({
  title, subtitle, endpoint, columns, editFields, writePermission, emptyBody, transformIn, transformOut,
}: {
  title: string
  subtitle: string
  endpoint: string
  columns: Column<T>[]
  editFields?: EditField[]
  writePermission: string
  emptyBody: string
  transformIn?: (row: T) => Record<string, unknown>
  transformOut?: (values: Record<string, unknown>) => Record<string, unknown>
}) {
  const { can } = useAuth()
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<T | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: T[] }>(`${endpoint}?limit=100`)
      setRows(r.data)
    } catch { /* handled by api layer */ } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { void load() }, [load])

  const canWrite = can(writePermission)

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={canWrite && editFields ? <Button onClick={() => setEditing('new')}>+ Tambah</Button> : undefined}
      />

      {loading ? (
        <Spinner />
      ) : rows.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-[12px] font-semibold text-ink-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.header} className={`px-5 py-3 ${c.className ?? ''}`}>{c.header}</th>
                  ))}
                  {canWrite && editFields ? <th className="px-5 py-3" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-paper">
                    {columns.map((c) => (
                      <td key={c.header} className={`px-5 py-3.5 ${c.className ?? ''}`}>{c.cell(row)}</td>
                    ))}
                    {canWrite && editFields ? (
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>Ubah</Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Empty title={`Belum ada data ${title.toLowerCase()}`} body={emptyBody} />
      )}

      {editing && editFields ? (
        <ResourceEditor
          title={title}
          endpoint={endpoint}
          fields={editFields}
          row={editing === 'new' ? null : (editing as T)}
          initial={editing === 'new' ? {} : transformIn?.(editing as T) ?? (editing as unknown as Record<string, unknown>)}
          transformOut={transformOut}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load() }}
        />
      ) : null}
    </>
  )
}

function ResourceEditor({
  title, endpoint, fields, row, initial, onClose, onSaved, transformOut,
}: {
  title: string
  endpoint: string
  fields: EditField[]
  row: { id: string } | null
  initial: Record<string, unknown>
  onClose: () => void
  onSaved: () => void
  transformOut?: (values: Record<string, unknown>) => Record<string, unknown>
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      const payload = transformOut ? transformOut(values) : values
      if (row) await api.patch(`${endpoint}/${row.id}`, payload)
      else await api.post(endpoint, payload)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

  return (
    <Modal open onClose={onClose} title={row ? `Ubah ${title}` : `Tambah ${title}`} wide>
      <div className="grid gap-4">
        {fields.map((f) => {
          const v = values[f.name]
          if (f.type === 'boolean') {
            return (
              <label key={f.name} className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 p-3.5">
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} className="mt-0.5 size-4 rounded border-ink-300 text-brand-600" />
                <span>
                  <span className="block text-sm font-semibold text-ink-800">{f.label}</span>
                  {f.hint ? <span className="block text-xs text-ink-500">{f.hint}</span> : null}
                </span>
              </label>
            )
          }
          return (
            <Field key={f.name} label={f.label} hint={f.hint} required={f.required}>
              {f.type === 'textarea' ? (
                <textarea rows={4} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />
              ) : f.type === 'list' ? (
                <textarea
                  rows={4}
                  value={Array.isArray(v) ? (v as string[]).join('\n') : String(v ?? '')}
                  onChange={(e) => set(f.name, e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                  className={inputCls}
                  placeholder="Satu baris untuk satu poin"
                />
              ) : f.type === 'select' ? (
                <select value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={selectCls}>
                  <option value="">— pilih —</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'number' ? (
                <input type="number" value={v === undefined || v === null ? '' : Number(v)} onChange={(e) => set(f.name, e.target.value === '' ? undefined : Number(e.target.value))} className={inputCls} />
              ) : (
                <input value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} className={inputCls} />
              )}
            </Field>
          )
        })}

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={() => void save()} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        </div>
      </div>
    </Modal>
  )
}

export { Pill }
