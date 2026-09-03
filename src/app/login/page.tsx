'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { login } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Button, Field, inputCls, Alert, Kbd } from '@/components/ui'

const LP = process.env.NEXT_PUBLIC_LP_URL ?? 'http://localhost:3005'

function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c-1.1 3.2-3.4 5-6 6.3 0 6 2.6 10.2 6 12.7 3.4-2.5 6-6.7 6-12.7-2.6-1.3-4.9-3.1-6-6.3Z" />
    </svg>
  )
}

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
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Email" required>
        <input name="email" type="email" required autoComplete="username" autoFocus className={inputCls} placeholder="nama@sarisedanabali.co.id" />
      </Field>
      <Field label="Kata sandi" required>
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} placeholder="••••••••••" />
      </Field>

      {error ? <Alert>{error}</Alert> : null}

      <Button type="submit" variant="dark" size="lg" loading={busy} className="mt-1 w-full">
        {busy ? 'Memeriksa…' : 'Masuk ke konsol'}
        {!busy ? <ArrowRight className="size-4" /> : null}
      </Button>
      <p className="text-center text-[11.5px] leading-relaxed text-ink-400">
        Tekan <Kbd>↵</Kbd> untuk masuk. Percobaan masuk dicatat dan dibatasi.
      </p>
    </form>
  )
}

/**
 * Two panels: the console's identity on the left, set on the same navy grid
 * as the sidebar, and the form on the right on paper. It looks like the tool
 * it opens, not a generic sign-in.
 */
export default function LoginPage() {
  const year = new Date().getFullYear()
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="grid-dark relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-green-500/10 blur-[100px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[var(--radius-tile)] bg-white/10 text-gold-300 ring-1 ring-inset ring-white/10">
            <Mark className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold">KSP Sari Sedana Bali</span>
            <span className="mono block text-[11px] text-white/45">konsol pengelolaan website</span>
          </span>
        </div>

        <div className="relative max-w-[30ch]">
          <p className="mono text-[11.5px] text-gold-300">— akses terbatas</p>
          <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.03em] xl:text-[2.9rem]">
            Satu tempat untuk mengelola seluruh website.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60">
            Halaman, produk, berita, menu, hingga calon nasabah yang masuk. Perubahan tayang di website begitu diterbitkan.
          </p>
        </div>

        <dl className="mono relative grid grid-cols-3 gap-6 border-t border-white/10 pt-6 text-[11px] text-white/45">
          <div><dt>website</dt><dd className="mt-1 truncate text-white/80">{LP.replace(/^https?:\/\//, '')}</dd></div>
          <div><dt>sesi</dt><dd className="mt-1 text-white/80">token memori · cookie httpOnly</dd></div>
          <div><dt>tahun</dt><dd className="mt-1 text-white/80">{year}</dd></div>
        </dl>
      </section>

      <section className="grid-light relative grid place-items-center bg-paper px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-9 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-gold-300"><Mark className="size-4" /></span>
            <span className="text-[14px] font-bold text-ink-900">KSP Sari Sedana Bali</span>
          </div>

          <div className="surface relative overflow-hidden p-7">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-gold-300 via-gold-200 to-transparent" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink-900">Masuk</h2>
                <p className="mt-1 text-[13px] text-ink-500">Gunakan akun pengelola Anda.</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-tile)] bg-paper text-ink-500 ring-1 ring-inset ring-line">
                <Lock className="size-4" />
              </span>
            </div>
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-ink-400">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Hanya untuk pengelola website. Lupa kata sandi? Hubungi administrator.
          </p>
        </div>
      </section>
    </div>
  )
}
