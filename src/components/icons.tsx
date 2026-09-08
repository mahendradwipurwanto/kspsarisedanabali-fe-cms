'use client'

import type { ComponentType } from 'react'
import {
  Sparkles, Calculator, MapPin, Phone, Users, TrendingUp, Wallet, Handshake, PiggyBank, Award, Star,
  ShieldCheck, Building2, Percent, Briefcase, FileText, Mail, Clock, Compass, Leaf, Check, Home, Newspaper,
} from 'lucide-react'
import { ICON_NAMES } from '@/contracts'
import { cn } from '@/lib/utils'

/**
 * The icons the website can draw, by the name it stores.
 *
 * Its own module because both the block form and the record forms need it, and
 * importing one from the other made a cycle out of two components that only
 * ever wanted this map.
 */
export const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  spark: Sparkles, calculator: Calculator, 'map-pin': MapPin, phone: Phone, users: Users, 'trending-up': TrendingUp,
  wallet: Wallet, handshake: Handshake, 'piggy-bank': PiggyBank, award: Award, star: Star, 'shield-check': ShieldCheck,
  building: Building2, percent: Percent, briefcase: Briefcase, 'file-text': FileText, mail: Mail, clock: Clock,
  compass: Compass, leaf: Leaf, check: Check, home: Home, newspaper: Newspaper,
}

/** Every icon the site knows, as a grid to pick from. */
export function IconGrid({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-7 gap-1.5 rounded-[var(--radius-input)] border border-line bg-white p-2 sm:grid-cols-11">
        {ICON_NAMES.map((name) => {
          const IconCmp = ICONS[name] ?? Sparkles
          const active = value === name
          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(active ? '' : name)}
              className={cn(
                'grid aspect-square place-items-center rounded-[6px] border transition-colors',
                active ? 'border-ink-900 bg-ink-900 text-gold-300' : 'border-transparent text-ink-600 hover:border-line hover:bg-paper hover:text-ink-900',
              )}
            >
              <IconCmp className="size-4" />
            </button>
          )
        })}
      </div>
      {value ? <span className="mono mt-1.5 block text-[11px] text-ink-400">{value}</span> : null}
    </>
  )
}

/** How much of a field's allowance is used. */
export const Counter = ({ len, max }: { len: number; max: number }) => (
  <span className={`tnum text-[11.5px] ${len > max ? 'text-red-600' : len > max * 0.9 ? 'text-gold-600' : 'text-ink-400'}`}>
    {len}/{max}
  </span>
)
