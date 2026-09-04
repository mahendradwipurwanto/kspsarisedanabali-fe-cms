'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-semibold [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ink-900 text-white',
        secondary: 'border-line bg-paper text-ink-600',
        success: 'border-green-200 bg-green-50 text-green-700',
        warning: 'border-gold-200 bg-gold-50 text-gold-700',
        destructive: 'border-red-100 bg-red-50 text-red-700',
        outline: 'border-line text-ink-700',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
