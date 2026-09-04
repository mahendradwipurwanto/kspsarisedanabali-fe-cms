'use client'

import { UserCog } from 'lucide-react'
import { ResourceList, Pill, type GridField } from '@/components/ResourceList'
import { fmtRelative } from '@/components/ui'

interface User {
  id: string; name: string; email: string; isActive: boolean; lastLoginAt: string | null
  roles: { id: string; name: string }[]
  branches: { id: string; name: string }[]
}

const FIELDS: GridField<User>[] = [
  { key: 'name', label: 'Nama', type: 'text', width: 220, readOnly: true, secondary: (r) => r.email },
  { key: 'email', label: 'Email', type: 'text', width: 240, readOnly: true },
  {
    key: 'roles', label: 'Peran', type: 'readonly', width: 200,
    get: (r) => r.roles.map((x) => x.name).join(', '),
    render: (r) => <span className="flex flex-wrap gap-1">{r.roles.map((x) => <Pill key={x.id} tone="green">{x.name}</Pill>)}</span>,
  },
  {
    key: 'branches', label: 'Cabang', type: 'readonly', width: 200,
    get: (r) => (r.branches.length ? r.branches.map((b) => b.name).join(', ') : 'Semua kantor'),
  },
  {
    key: 'lastLoginAt', label: 'Terakhir masuk', type: 'readonly', width: 160,
    get: (r) => (r.lastLoginAt ? fmtRelative(r.lastLoginAt) : 'Belum pernah'),
  },
  { key: 'isActive', label: 'Aktif', type: 'boolean', width: 100 },
]

export default function UsersPage() {
  return (
    <ResourceList<User>
      title="Pengguna"
      subtitle="Siapa saja yang bisa masuk ke konsol ini, dan dengan peran apa."
      endpoint="/users"
      viewKey="pengguna"
      writePermission="users:write"
      emptyIcon={<UserCog className="size-5" />}
      emptyBody="Tambahkan pengguna agar tim koperasi bisa mengelola website."
      fields={FIELDS}
      canCreate={false}
      canDelete={false}
      recordTitle={(r) => r.name}
      panelNote={
        <p className="text-[12px] leading-relaxed text-ink-500">
          Peran, cabang, dan kata sandi diubah oleh administrator lewat menu Peran &amp; Hak Akses. Di sini hanya status aktif yang bisa disetel.
        </p>
      }
    />
  )
}
