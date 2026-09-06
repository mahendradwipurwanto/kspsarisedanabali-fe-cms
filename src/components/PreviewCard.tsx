'use client'

import { useState, type ReactNode } from 'react'
import { Maximize2 } from 'lucide-react'
import { Card, Modal, Button } from './ui'

const ZOOMS = [1.5, 2, 3] as const

/**
 * A schematic preview with a way to see it properly.
 *
 * The sidebar is 380px wide, so the schemes are drawn at 9px type: fine for a
 * glance at the shape, useless for reading a label. "Perbesar" — or a click
 * on the scheme itself — opens the same drawing in a dialog at two, three
 * times the size, without maintaining a second, larger version of it.
 */
export function PreviewCard({
  title = 'Pratinjau', description = 'Skema, bukan tampilan piksel.', note, children,
}: { title?: string; description?: string; note?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState<number>(2)

  return (
    <>
      <Card
        title={title}
        description={description}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <Maximize2 className="size-3.5" /> Perbesar
          </Button>
        }
      >
        <div
          role="button"
          tabIndex={0}
          aria-label={`Perbesar ${title.toLowerCase()}`}
          title="Klik untuk memperbesar"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
          className="cursor-zoom-in rounded-[var(--radius-tile)] outline-none ring-offset-2 transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-green-600"
        >
          {children}
        </div>
        {note}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-1" role="group" aria-label="Skala pratinjau">
              {ZOOMS.map((z) => (
                <Button key={z} type="button" size="sm" variant={zoom === z ? 'dark' : 'secondary'} onClick={() => setZoom(z)} aria-pressed={zoom === z}>
                  {Math.round(z * 100)}%
                </Button>
              ))}
            </span>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Tutup</Button>
          </div>
        }
      >
        <div className="scroll-thin max-h-[70vh] overflow-auto rounded-[var(--radius-tile)] bg-paper p-4">
          {/* `zoom` scales layout as well as paint, so the scheme reflows at the
              larger size instead of blurring the way a transform would. */}
          <div style={{ zoom }} className="mx-auto w-[360px]">
            {children}
          </div>
        </div>
      </Modal>
    </>
  )
}
