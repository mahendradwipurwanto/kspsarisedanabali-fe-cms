'use client'

import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Slot } from '@radix-ui/react-slot'
import { X, Loader2, Check, AlertTriangle, Info, CircleAlert } from 'lucide-react'

export { Badge, badgeVariants } from './badge'
export { Checkbox } from './checkbox'

/* ─────────────────────────────── inputs ─────────────────────────────── */

export const inputCls =
  'w-full min-w-0 rounded-[var(--radius-input)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink-900 ' +
  'placeholder:text-ink-300 transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-line-strong focus:border-green-600 focus:outline-none focus:shadow-[0_0_0_3px_rgb(78_139_44/0.18)] ' +
  'disabled:bg-paper disabled:text-ink-400'

export const selectCls = `${inputCls} select-chev`

/* ─────────────────────────────── buttons ────────────────────────────── */

const BTN = {
  primary: 'bg-green-600 text-white hover:bg-green-700',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'bg-white text-ink-800 border border-line hover:border-ink-900 hover:text-ink-900',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerGhost: 'text-red-600 hover:bg-red-50',
}
const SIZE = { xs: 'h-7 px-2.5 text-xs gap-1', sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-11 px-5 text-sm' }

export function Button({
  children, variant = 'primary', size = 'md', loading = false, className = '', disabled, asChild = false, ...rest
}: {
  children: ReactNode
  variant?: keyof typeof BTN
  size?: keyof typeof SIZE
  loading?: boolean
  /** Render the child element with the button's styling, as shadcn does. */
  asChild?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-input)] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0 ${BTN[variant]} ${SIZE[size]} ${className}`}
      disabled={asChild ? undefined : disabled || loading}
      {...rest}
    >
      {asChild ? children : (
        <>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export function IconButton({
  label, children, className = '', size = 'md', ...rest
}: { label: string; children: ReactNode; size?: 'sm' | 'md' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-[6px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40 ${size === 'sm' ? 'size-7' : 'size-8'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mono inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-line bg-paper px-1 text-[10.5px] font-medium text-ink-500">
      {children}
    </kbd>
  )
}

/* ─────────────────────────────── surfaces ───────────────────────────── */

export function Card({
  children, className = '', title, description, action, tone = 'white',
}: {
  children: ReactNode
  className?: string
  title?: string
  description?: string
  action?: ReactNode
  tone?: 'white' | 'dark' | 'paper'
}) {
  const base = tone === 'dark' ? 'surface-dark grid-dark' : tone === 'paper' ? 'rounded-[var(--radius-card)] border border-line bg-paper' : 'surface'
  if (!title) return <div className={`${base} ${className}`}>{children}</div>
  return (
    <section className={`${base} ${className}`}>
      {/* Wraps rather than squeezes: a header action wide enough to matter — a
          segmented control, say — has nowhere to go on a phone otherwise, and
          pushes the card past the edge of the screen. */}
      <header className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5 border-b px-5 py-4 ${tone === 'dark' ? 'border-white/10' : 'border-line'}`}>
        <div className="min-w-0">
          <h2 className={`text-[15px] font-bold ${tone === 'dark' ? 'text-white' : 'text-ink-900'}`}>{title}</h2>
          {description ? <p className={`mt-0.5 text-[13px] ${tone === 'dark' ? 'text-white/55' : 'text-ink-500'}`}>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function PageHeader({
  title, subtitle, action, eyebrow, stickyAction,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  eyebrow?: string
  /**
   * Keep the actions reachable on a long form: once the heading scrolls away,
   * a slim bar with the same buttons pins under the app's top bar. It is worth
   * the extra markup on a screen where the save button is otherwise a scroll
   * away from whatever you just changed.
   */
  stickyAction?: boolean
}) {
  const [stuck, setStuck] = useState(false)
  const mark = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mark.current
    if (!stickyAction || !el || typeof IntersectionObserver === 'undefined') return
    // The app's own header is 56px tall; the heading counts as gone once it
    // passes behind it.
    const io = new IntersectionObserver(([entry]) => setStuck(!entry?.isIntersecting), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [stickyAction])

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="t-label mb-1.5">{eyebrow}</p> : null}
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900 sm:text-[26px]">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>

      {stickyAction && action ? (
        <>
          {/* Watched, not drawn: it marks where the heading ends. */}
          <div ref={mark} aria-hidden="true" className="-mt-6 h-px" />
          {/* A negative margin equal to its own height keeps it out of the flow,
              so nothing on the page moves when it appears. */}
          <div
            className={`sticky top-14 z-10 -mx-4 -mb-[60px] flex h-[60px] items-center justify-between gap-3 border-b border-line bg-paper/92 px-4 backdrop-blur transition-opacity duration-200 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${
              stuck ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <p className="truncate text-[13.5px] font-bold text-ink-900">{title}</p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
          </div>
        </>
      ) : null}
    </>
  )
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-[13px] font-bold text-ink-900">{children}</h3>
      {hint ? <span className="text-[12px] text-ink-400">{hint}</span> : null}
    </div>
  )
}

/* ─────────────────────────────── forms ──────────────────────────────── */

export function Field({
  label, hint, error, required, children, counter,
}: {
  label: string; hint?: string; error?: string; required?: boolean; children: ReactNode; counter?: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-700">
          {label} {required ? <span className="text-red-600" aria-hidden="true">*</span> : null}
        </span>
        {counter}
      </span>
      {children}
      {hint && !error ? <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-400">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-[12px] font-medium text-red-600">{error}</span> : null}
    </label>
  )
}

/** A toggle drawn as a switch: reads as on/off at a glance, unlike a checkbox. */
export function Switch({
  checked, onChange, label, hint, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-[var(--radius-input)] border border-line bg-white p-3.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-line-strong'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-green-600' : 'bg-ink-300'}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 [transition-timing-function:var(--ease-settle)] ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{hint}</span> : null}
      </span>
    </label>
  )
}

export function Segmented<T extends string>({
  options, value, onChange, size = 'md', ariaLabel,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; ariaLabel?: string }) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-[var(--radius-input)] border border-line bg-white p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-[6px] font-semibold transition-colors ${size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'} ${
              active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-paper hover:text-ink-900'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────── feedback ───────────────────────────── */

const TONES = {
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-gold-50 text-gold-700 ring-gold-200',
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  red: 'bg-red-50 text-red-700 ring-red-100',
  grey: 'bg-ink-100 text-ink-600 ring-ink-200',
  dark: 'bg-ink-900 text-gold-300 ring-ink-900',
}

export function Pill({ children, tone = 'grey', dot }: { children: ReactNode; tone?: keyof typeof TONES; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function Empty({ title, body, action, icon }: { title: string; body: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-paper px-6 py-12 text-center">
      {icon ? <div className="mx-auto mb-4 grid size-11 place-items-center rounded-[var(--radius-tile)] bg-ink-900 text-gold-300">{icon}</div> : null}
      <p className="font-bold text-ink-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-[13.5px] text-ink-500">
      <Loader2 className="size-4 animate-spin text-ink-400" aria-hidden="true" />
      {label}
    </div>
  )
}

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'green' | 'amber' | 'info'; children: ReactNode }) {
  const styles = {
    red: ['bg-red-50 text-red-700 ring-red-100', CircleAlert],
    green: ['bg-green-50 text-green-800 ring-green-200', Check],
    amber: ['bg-gold-50 text-gold-700 ring-gold-200', AlertTriangle],
    info: ['bg-ink-100 text-ink-700 ring-ink-200', Info],
  } as const
  const [cls, IconCmp] = styles[tone]
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-[var(--radius-input)] px-4 py-3 text-[13.5px] font-medium leading-relaxed ring-1 ring-inset ${cls}`}>
      <IconCmp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}

/* ─────────────────────────────── overlay ────────────────────────────── */

const MODAL_W = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl', '2xl': 'max-w-[1360px]' }

/**
 * The app's dialog, on Radix like the record sheet.
 *
 * It has to be Radix rather than a hand-rolled portal: a modal Radix layer
 * switches off pointer events outside itself and dismisses on a pointerdown it
 * considers outside. A plain `createPortal` dialog opened from inside the
 * record sheet — the media picker — therefore landed outside that layer: its
 * buttons were dead and the first click closed the sheet underneath it. Radix
 * stacks nested layers instead, so the inner dialog takes the focus and the
 * clicks while the outer one waits.
 *
 * Being Radix has one consequence worth spelling out: it locks scrolling
 * everywhere except inside the dialog's own content, so the element that
 * scrolls has to sit *within* that content. A tall dialog whose scroller was
 * the backdrop around it simply would not move. Hence the column below —
 * header and footer hold still, the middle scrolls.
 */
export function Modal({
  open, onClose, title, description, children, wide, size, footer,
}: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode
  wide?: boolean; size?: keyof typeof MODAL_W; footer?: ReactNode
}) {
  const width = MODAL_W[size ?? (wide ? 'lg' : 'md')]
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-950/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8">
          <DialogPrimitive.Content
            className={`rise flex max-h-full w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-white shadow-[var(--shadow-lift)] ${width}`}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-[15px] font-bold text-ink-900">{title}</DialogPrimitive.Title>
                {description
                  ? <DialogPrimitive.Description className="mt-0.5 text-[13px] text-ink-500">{description}</DialogPrimitive.Description>
                  : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
              </div>
              <IconButton label="Tutup" onClick={onClose}><X className="size-4" /></IconButton>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer ? <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div> : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ─────────────────────────────── formatting ─────────────────────────── */

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
