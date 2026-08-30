'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Button, Card, Field, inputCls, Alert } from '@/components/ui'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { reload } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    try {
      await login(String(fd.get('email')), String(fd.get('password')))
      await reload()
      router.replace(params.get('next') || '/')
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-sm p-7">
      <div className="mb-7 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-brand-600 text-white">
          <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5c-1.1 3.2-3.4 5-6 6.3 0 6 2.6 10.2 6 12.7 3.4-2.5 6-6.7 6-12.7-2.6-1.3-4.9-3.1-6-6.3Z" />
          </svg>
        </span>
        <h1 className="text-xl font-bold tracking-tight text-ink-900">Masuk ke Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">KSP Sari Sedana Bali</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label="Email" required>
          <input name="email" type="email" required autoComplete="username" autoFocus className={inputCls} placeholder="nama@sarisedanabali.co.id" />
        </Field>
        <Field label="Kata sandi" required>
          <input name="password" type="password" required autoComplete="current-password" className={inputCls} placeholder="••••••••••" />
        </Field>

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Memeriksa…' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-500">
        Halaman ini hanya untuk pengelola website. Percobaan masuk dicatat dan dibatasi.
      </p>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
