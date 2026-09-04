'use client'

import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[2px]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className, children, side = 'right', ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'right' | 'left' | 'top' | 'bottom' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-0 bg-white shadow-[var(--shadow-lift)] transition ease-in-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
          side === 'right' && 'inset-y-0 right-0 h-full w-full max-w-xl border-l border-line data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'left' && 'inset-y-0 left-0 h-full w-full max-w-xl border-r border-line data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[var(--radius-card)] border-t border-line',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 grid size-8 place-items-center rounded-[6px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus:outline-none">
          <X className="size-4" />
          <span className="sr-only">Tutup</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 border-b border-line px-5 py-4 pr-14', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-auto flex items-center justify-between gap-3 border-t border-line bg-paper px-5 py-3.5', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('truncate text-[16px] font-bold text-ink-900', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('truncate text-[12.5px] text-ink-500', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
