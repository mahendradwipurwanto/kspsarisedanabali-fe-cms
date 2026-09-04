'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-line-strong bg-white transition-colors outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-green-600/25 focus-visible:border-green-600',
        'data-[state=checked]:border-ink-900 data-[state=checked]:bg-ink-900 data-[state=checked]:text-white',
        'data-[state=indeterminate]:border-ink-900 data-[state=indeterminate]:bg-ink-900 data-[state=indeterminate]:text-white',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
