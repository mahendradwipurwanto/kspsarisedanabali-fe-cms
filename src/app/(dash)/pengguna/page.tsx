'use client'

import { ResourceList, Pill } from '@/components/ResourceList'
import { fmtRelative } from '@/components/ui'

interface User {
  id: string; name: string; email: string; isActive: boolean; lastLoginAt: string | null
  roles: { id: string; name: string }[]
  branches: { id: string; name: string }[]
}

export default function UsersPage() {
  return (
    <ResourceList<User>
      title="Pengguna"
      subtitle="Siapa saja yang bisa masuk ke dashboard ini, dan dengan peran apa."
      endpoint="/users"
      writePermission="users:write"
      emptyBody="Tambahkan pengguna agar tim koperasi bisa mengelola website."
      columns={[
        { header: 'Nama', cell: (r) => (<><span className="block font-semibold text-ink-900">{r.name}</span><span className="block text-xs text-ink-500">{r.email}</span></>) },
        { header: 'Peran', cell: (r) => <span className="flex flex-wrap gap-1">{r.roles.map((x) => <Pill key={x.id} tone="green">{x.name}</Pill>)}</span> },
        { header: 'Cabang', cell: (r) => (r.branches.length ? r.branches.map((b) => b.name).join(', ') : 'Semua') },
        { header: 'Terakhir masuk', cell: (r) => <span className="text-xs text-ink-500">{r.lastLoginAt ? fmtRelative(r.lastLoginAt) : 'Belum pernah'}</span> },
        { header: 'Status', cell: (r) => <Pill tone={r.isActive ? 'green' : 'grey'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Pill> },
      ]}
    />
  )
}
