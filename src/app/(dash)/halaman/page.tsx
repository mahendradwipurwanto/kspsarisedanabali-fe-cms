'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, PageHeader, Pill, Spinner, Empty, Button, fmtRelative } from '@/components/ui'

interface Row {
  id: string; title: string; slug: string; status: string; isSystem: boolean
  updatedAt: string; updatedByName?: string | null; blockCount: number
}

const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'grey' }> = {
  published: { label: 'Terbit', tone: 'green' },
  review: { label: 'Menunggu Review', tone: 'amber' },
  draft: { label: 'Draf', tone: 'grey' },
}

export default function PagesList() {
  const { can } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void api.get<{ data: Row[] }>('/pages?limit=100').then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <>
      <PageHeader
        title="Halaman"
        subtitle="Semua halaman website. Klik untuk mengubah isinya blok demi blok."
      />

      {rows.length ? (
        <Card>
          <ul className="divide-y divide-ink-200">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/halaman/${row.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink-50">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-900">{row.title}</span>
                      <Pill tone={STATUS[row.status]?.tone ?? 'grey'}>{STATUS[row.status]?.label ?? row.status}</Pill>
                      {row.isSystem ? <Pill tone="grey">Sistem</Pill> : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink-500">
                      /{row.slug === '/' ? '' : row.slug} · {row.blockCount} blok
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink-400">
                    <span className="block">Diubah {fmtRelative(row.updatedAt)}</span>
                    {row.updatedByName ? <span className="block">oleh {row.updatedByName}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Empty
          title="Belum ada halaman"
          body="Halaman utama website akan muncul di sini setelah data awal dimasukkan."
          action={can('pages:create') ? <Button>Buat halaman baru</Button> : undefined}
        />
      )}
    </>
  )
}
