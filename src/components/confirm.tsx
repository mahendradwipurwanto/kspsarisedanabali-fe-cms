'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

/**
 * A yes/no question in the console's own dialog instead of the browser's
 * `confirm()`. Ask it from anywhere with `const confirm = useConfirm()` and
 * `if (!(await confirm({ title: 'Hapus?' }))) return`.
 *
 * One provider near the root keeps a single dialog; the promise resolves
 * true on the confirming button, false on cancel, Escape, or the backdrop.
 */
export interface ConfirmOptions {
  title: string
  /** One or two sentences on what happens; a string or richer content. */
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` for anything that deletes or takes something off the website. */
  tone?: 'danger' | 'default'
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Ask | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const ask = useCallback<Ask>((options) => new Promise((resolve) => setPending({ ...options, resolve })), [])
  const settle = useCallback((value: boolean) => {
    setPending((p) => { p?.resolve(value); return null })
  }, [])

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <ConfirmDialog pending={pending} onSettle={settle} />
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('useConfirm() needs a <ConfirmProvider> above it')
  return ask
}

function ConfirmDialog({ pending, onSettle }: { pending: (ConfirmOptions & { resolve: (v: boolean) => void }) | null; onSettle: (v: boolean) => void }) {
  const danger = pending?.tone === 'danger'
  const footRef = useRef<HTMLDivElement>(null)

  // Focus goes to the safe choice for destructive questions and to the
  // confirming one otherwise, so Enter does the expected thing. It is set a
  // beat after opening: the dropdown menu that usually triggers a delete
  // hands focus back to its own trigger while closing, which would otherwise
  // win over an autoFocus.
  useEffect(() => {
    if (!pending) return
    const focusChoice = () => footRef.current?.querySelector<HTMLButtonElement>(danger ? '[data-safe]' : '[data-ok]')?.focus()
    // Twice: once right away, once after a menu's exit animation (~150 ms)
    // has finished and handed focus back to its trigger.
    const ids = [40, 320].map((ms) => window.setTimeout(focusChoice, ms))
    return () => ids.forEach((id) => window.clearTimeout(id))
  }, [pending, danger])

  const cancel = useCallback(() => onSettle(false), [onSettle])

  return (
    <Modal
      open={Boolean(pending)}
      onClose={cancel}
      title={pending?.title ?? ''}
      size="sm"
      footer={
        <div ref={footRef} className="contents">
          <Button type="button" variant="secondary" data-safe onClick={cancel}>{pending?.cancelLabel ?? 'Batal'}</Button>
          <Button type="button" variant={danger ? 'danger' : 'dark'} data-ok onClick={() => onSettle(true)}>{pending?.confirmLabel ?? 'Ya, lanjutkan'}</Button>
        </div>
      }
    >
      <div className="flex gap-3.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-tile)] ring-1 ring-inset ${danger ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-paper text-ink-500 ring-line'}`}>
          {danger ? <AlertTriangle className="size-4" /> : <HelpCircle className="size-4" />}
        </span>
        <div className="min-w-0 text-[13.5px] leading-relaxed text-ink-600">
          {pending?.body ?? 'Tindakan ini tidak bisa dibatalkan.'}
        </div>
      </div>
    </Modal>
  )
}
