'use client'

import { useEffect, useState } from 'react'
import { PERMISSION_GROUPS, PERMISSIONS } from '@/contracts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Button, Modal, Field, inputCls, Alert } from '@/components/ui'

interface Role {
  id: string; key: string; name: string; description?: string | null
  permissions: string[]; isLocked: boolean; userCount: number
}

/**
 * Custom role builder.
 *
 * Permissions are checkboxes grouped by module with a plain-Indonesian
 * description each, so a non-technical administrator can compose a role without
 * knowing what `leads:read:branch` means.
 */
export default function RolesPage() {
  const { can } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | 'new' | null>(null)

  const load = () =>
    api.get<{ data: Role[] }>('/roles').then((r) => setRoles(r.data)).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { void load() }, [])

  if (loading) return <Spinner />

  return (
    <>
      <PageHeader
        title="Peran & Hak Akses"
        subtitle="Tentukan apa yang boleh dilakukan setiap peran. Perubahan berlaku saat pengguna masuk berikutnya."
        action={can('roles:manage') ? <Button onClick={() => setEditing('new')}>+ Peran Baru</Button> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-ink-900">
                  {role.name}
                  {role.isLocked ? <Pill tone="grey">Terkunci</Pill> : null}
                </h2>
                {role.description ? <p className="mt-1 text-sm leading-relaxed text-ink-500">{role.description}</p> : null}
              </div>
              {can('roles:manage') ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(role)}>
                  {role.isLocked ? 'Lihat' : 'Ubah'}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4 text-sm text-ink-500">
              <Pill tone="green">{role.permissions.length} hak akses</Pill>
              <Pill tone="grey">{role.userCount} pengguna</Pill>
            </div>
          </Card>
        ))}
      </div>

      {editing ? (
        <RoleEditor
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load() }}
        />
      ) : null}
    </>
  )
}

function RoleEditor({ role, onClose, onSaved }: { role: Role | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const locked = role?.isLocked ?? false
  const toggle = (p: string) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))

  async function save() {
    setBusy(true)
    setError('')
    try {
      if (role) await api.patch(`/roles/${role.id}`, { name, description, permissions: selected })
      else await api.post('/roles', { name, description, permissions: selected })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={role ? `Peran: ${role.name}` : 'Peran Baru'} wide>
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama peran" required>
            <input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Staf Cabang Rendang" />
          </Field>
          <Field label="Keterangan singkat">
            <input value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {locked ? <Alert tone="amber">Peran sistem — hak aksesnya dikunci dan tidak bisa diubah.</Alert> : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-800">Hak akses ({selected.length} dipilih)</span>
            {!locked ? (
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(Object.keys(PERMISSIONS))}>Pilih semua</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Kosongkan</Button>
              </span>
            ) : null}
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-ink-200">
            {PERMISSION_GROUPS.map((group) => {
              const allOn = group.permissions.every((p) => selected.includes(p))
              return (
                <div key={group.label} className="border-b border-ink-200 last:border-0">
                  <div className="flex items-center justify-between bg-ink-50 px-4 py-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-500">{group.label}</span>
                    {!locked ? (
                      <button
                        onClick={() =>
                          setSelected((s) =>
                            allOn ? s.filter((p) => !group.permissions.includes(p as never)) : [...new Set([...s, ...group.permissions])],
                          )
                        }
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {allOn ? 'Hapus semua' : 'Pilih semua'}
                      </button>
                    ) : null}
                  </div>
                  <ul>
                    {group.permissions.map((permission) => (
                      <li key={permission}>
                        <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-brand-50/50">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={selected.includes(permission)}
                            onChange={() => toggle(permission)}
                            className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>
                            <span className="block text-sm text-ink-800">{PERMISSIONS[permission]}</span>
                            <code className="block text-[11px] text-ink-400">{permission}</code>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          {!locked ? (
            <Button onClick={() => void save()} disabled={busy || !name || !selected.length}>
              {busy ? 'Menyimpan…' : 'Simpan Peran'}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
