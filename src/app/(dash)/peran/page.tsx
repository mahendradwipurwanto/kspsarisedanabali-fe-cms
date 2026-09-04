'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PERMISSION_GROUPS, PERMISSIONS } from '@/contracts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { PageHeader, Empty, Button, Modal, Field, inputCls, Alert, Badge } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { buildColumns, defaultHidden, fieldText, type TableField } from '@/components/fields'

interface Role {
  id: string; key: string; name: string; description?: string | null
  permissions: string[]; isLocked: boolean; userCount: number
}

const FIELDS: TableField<Role>[] = [
  { key: 'name', label: 'Nama peran', type: 'text', required: true, secondary: (r) => r.key },
  { key: 'description', label: 'Keterangan', type: 'text' },
  { key: 'permissions', label: 'Hak akses', type: 'readonly', width: 130, get: (r) => `${r.permissions.length} hak akses` },
  { key: 'userCount', label: 'Pengguna', type: 'number', width: 110 },
  {
    key: 'isLocked', label: 'Jenis', type: 'readonly', width: 120,
    get: (r) => (r.isLocked ? 'Sistem' : 'Kustom'),
    render: (r) => (r.isLocked ? <Badge variant="outline"><Lock className="size-3" /> Sistem</Badge> : <Badge variant="secondary">Kustom</Badge>),
  },
  { key: 'key', label: 'Kunci', type: 'readonly', hiddenByDefault: true },
]

/**
 * Roles as a table, with the permission builder behind the row action.
 *
 * Permissions are checkboxes grouped by module with a plain-Indonesian
 * description each, so an administrator can compose a role without knowing
 * what `leads:read:branch` means.
 */
export default function RolesPage() {
  const { can } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | 'new' | null>(null)
  const canManage = can('roles:manage')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get<{ data: Role[] }>('/roles')
      setRoles(r.data)
    } catch (e) {
      toast.error('Gagal memuat peran', { description: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const columns = useMemo(
    () => buildColumns<Role>({
      fields: FIELDS,
      selectable: false,
      canWrite: canManage,
      onEdit: setEditing,
      editLabel: canManage ? 'Ubah hak akses' : 'Lihat hak akses',
    }),
    [canManage],
  )

  return (
    <>
      <PageHeader
        title="Peran & Hak Akses"
        subtitle="Tentukan apa yang boleh dilakukan setiap peran. Perubahan berlaku saat pengguna masuk berikutnya."
      />

      <DataTable<Role>
        columns={columns}
        data={roles}
        loading={loading}
        storageKey="peran"
        initialVisibility={defaultHidden(FIELDS)}
        searchPlaceholder="Cari peran…"
        globalFilterFn={(row, _id, value) => {
          const q = String(value).toLowerCase()
          return FIELDS.some((f) => fieldText(row.original, f).toLowerCase().includes(q))
        }}
        canWrite={canManage}
        onCreate={() => setEditing('new')}
        createLabel="Peran baru"
        onRowClick={setEditing}
        emptyState={<Empty icon={<ShieldCheck className="size-5" />} title="Belum ada peran" body="Peran bawaan akan muncul setelah data awal dimasukkan." />}
      />

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
      toast.success(role ? 'Peran diperbarui' : 'Peran baru dibuat')
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
      title={role ? role.name : 'Peran baru'}
      description={role ? `${selected.length} hak akses · ${role.userCount} pengguna` : 'Pilih hak akses yang boleh dipakai peran ini.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          {!locked ? (
            <Button variant="dark" onClick={() => void save()} loading={busy} disabled={!name || !selected.length}>Simpan peran</Button>
          ) : null}
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama peran" required>
            <input value={name} disabled={locked} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Staf Cabang Rendang" />
          </Field>
          <Field label="Keterangan singkat">
            <input value={description} disabled={locked} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {locked ? <Alert tone="amber">Peran sistem. Hak aksesnya dikunci dan tidak bisa diubah.</Alert> : null}

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-700">Hak akses <span className="tnum font-normal text-ink-400">({selected.length} dipilih)</span></span>
            {!locked ? (
              <span className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setSelected(Object.keys(PERMISSIONS))}>Pilih semua</Button>
                <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Kosongkan</Button>
              </span>
            ) : null}
          </div>

          <div className="scroll-thin max-h-[45vh] overflow-y-auto rounded-[var(--radius-card)] border border-line">
            {PERMISSION_GROUPS.map((group) => {
              const allOn = group.permissions.every((p) => selected.includes(p))
              return (
                <div key={group.label} className="border-b border-line last:border-0">
                  <div className="flex items-center justify-between bg-paper px-4 py-2">
                    <span className="text-[12px] font-semibold text-ink-500">{group.label}</span>
                    {!locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((s) =>
                            allOn ? s.filter((p) => !group.permissions.includes(p as never)) : [...new Set([...s, ...group.permissions])],
                          )
                        }
                        className="text-[12px] font-semibold text-green-700 hover:underline"
                      >
                        {allOn ? 'Hapus semua' : 'Pilih semua'}
                      </button>
                    ) : null}
                  </div>
                  <ul>
                    {group.permissions.map((permission) => (
                      <li key={permission}>
                        <label className="flex cursor-pointer items-start gap-3 px-4 py-2.5 hover:bg-paper">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={selected.includes(permission)}
                            onChange={() => toggle(permission)}
                            className="mt-0.5 size-4 shrink-0 accent-[#0f1b2d]"
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] text-ink-800">{PERMISSIONS[permission]}</span>
                            <span className="mono block text-[11px] text-ink-400">{permission}</span>
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
      </div>
    </Modal>
  )
}
