'use client'

import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-100'

const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-ink-800 ring-1 ring-inset ring-ink-300 hover:bg-ink-50',
  danger: 'bg-[#c4443a] text-white hover:bg-[#a3352c]',
  ghost: 'text-ink-600 hover:bg-ink-100',
}
const SIZE = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-sm' }

export function Button({
  children, variant = 'primary', size = 'md', className = '', ...rest
}: {
  children: ReactNode
  variant?: keyof typeof BTN
  size?: keyof typeof SIZE
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-ink-200 bg-white ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Field({
  label, hint, error, required, children,
}: {
  label: string; hint?: string; error?: string; required?: boolean; children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-800">
        {label} {required ? <span className="text-[#c4443a]">*</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-[#c4443a]">{error}</span> : null}
    </label>
  )
}

const TONES = {
  green: 'bg-brand-50 text-brand-700 ring-brand-200',
  amber: 'bg-[#fdf4e3] text-[#8a6a10] ring-[#e6cf8a]',
  red: 'bg-[#fdf1f0] text-[#a3352c] ring-[#f0c8c4]',
  grey: 'bg-ink-100 text-ink-600 ring-ink-200',
}

export function Pill({ children, tone = 'grey' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>{children}</span>
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 px-6 py-12 text-center">
      <p className="font-semibold text-ink-800">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-500">
      <span className="size-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" aria-hidden="true" />
      {label}
    </div>
  )
}

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'green' | 'amber'; children: ReactNode }) {
  const styles = {
    red: 'bg-[#fdf1f0] text-[#a3352c] ring-[#f0c8c4]',
    green: 'bg-brand-50 text-brand-800 ring-brand-200',
    amber: 'bg-[#fdf4e3] text-[#8a6a10] ring-[#e6cf8a]',
  }
  return <div role="alert" className={`rounded-lg px-4 py-3 text-sm font-medium ring-1 ring-inset ${styles[tone]}`}>{children}</div>
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full rounded-xl bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <h2 className="font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">
            <svg viewBox="0 0 20 20" className="size-4" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—'

export const fmtDateTime = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—'

export const fmtRelative = (d: string | Date) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return fmtDate(d)
}
