/**
 * Wireframe thumbnails for the block picker.
 *
 * Each block type maps to one of a dozen shapes drawn from a few grey and
 * green boxes, so an editor can tell a three-card row from a form or a
 * timeline before reading a word. They are deliberately schematic: the live
 * preview beside the list shows the real thing.
 */

const box = 'rounded-[3px] bg-ink-200'
const ink = 'rounded-[3px] bg-ink-800'
const green = 'rounded-[3px] bg-green-600'
const gold = 'rounded-[3px] bg-gold-400'
const line = (w: string, extra = '') => <span className={`block h-[3px] ${w} ${box} ${extra}`} />

function Cards({ n, image = false, icon = true }: { n: number; image?: boolean; icon?: boolean }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="grid gap-1 rounded-[4px] border border-ink-200 bg-white p-1.5">
          {image ? <span className={`block h-6 ${box}`} /> : icon ? <span className={`block size-3 ${green}`} /> : null}
          {line('w-3/4', 'bg-ink-400')}
          {line('w-full')}
        </span>
      ))}
    </div>
  )
}

const SKETCHES: Record<string, () => React.ReactNode> = {
  hero: () => (
    <div className="grid h-full grid-cols-[1.2fr_1fr] items-center gap-2 rounded-[4px] bg-ink-900 p-2">
      <span className="grid gap-1">
        <span className="block h-[3px] w-1/3 rounded bg-gold-400" />
        <span className="block h-[5px] w-full rounded bg-white/80" />
        <span className="block h-[5px] w-4/5 rounded bg-white/80" />
        <span className="mt-1 block h-[6px] w-1/3 rounded-full bg-green-500" />
      </span>
      <span className="grid gap-1 rounded-[3px] border border-white/20 p-1.5">
        <span className="block h-[3px] w-1/2 rounded bg-white/40" />
        <span className="block h-[7px] w-2/3 rounded bg-gold-300" />
        <span className="block h-[3px] w-full rounded bg-white/30" />
      </span>
    </div>
  ),
  banner: () => (
    <div className="grid h-full content-end gap-1 rounded-[4px] bg-gradient-to-t from-ink-900 to-ink-400 p-2">
      <span className="block h-[5px] w-2/3 rounded bg-white/85" />
      <span className="block h-[3px] w-1/2 rounded bg-white/50" />
    </div>
  ),
  heading: () => (
    <div className="grid h-full content-center gap-1.5 px-2">
      <span className="block h-[3px] w-1/4 rounded bg-green-600" />
      <span className="block h-[7px] w-5/6 rounded bg-ink-800" />
      <span className="block h-[7px] w-3/5 rounded bg-ink-800" />
      {line('w-2/3', 'mt-1')}
    </div>
  ),
  strip: () => (
    <div className="grid h-full content-center gap-1.5 px-2">
      <span className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => <span key={i} className="flex items-center gap-1 rounded-[4px] border border-ink-200 bg-white p-1.5"><span className={`block size-3 shrink-0 ${ink}`} />{line('w-full')}</span>)}
      </span>
    </div>
  ),
  legal: () => (
    <div className="flex h-full items-center gap-2 rounded-[4px] border border-ink-200 bg-paper px-2">
      <span className={`block size-4 shrink-0 ${green}`} />
      <span className="grid flex-1 gap-1">{line('w-3/4', 'bg-ink-400')}{line('w-1/2')}</span>
      <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`block size-3 ${box}`} />)}</span>
    </div>
  ),
  cards: () => <div className="grid h-full content-center px-1"><Cards n={3} /></div>,
  cards4: () => <div className="grid h-full content-center px-1"><Cards n={4} /></div>,
  stats: () => (
    <div className="grid h-full content-center px-1">
      <div className="grid grid-cols-4 divide-x divide-ink-200 rounded-[4px] border border-ink-200 bg-white">
        {[0, 1, 2, 3].map((i) => <span key={i} className="grid gap-1 p-1.5"><span className="block h-[7px] w-3/4 rounded bg-ink-800" />{line('w-1/2')}</span>)}
      </div>
    </div>
  ),
  products: () => <div className="grid h-full content-center px-1"><Cards n={3} image /></div>,
  list: () => (
    <div className="grid h-full content-center gap-1 px-2">
      <span className="block h-[5px] w-1/2 rounded bg-ink-800" />
      {[0, 1, 2].map((i) => <span key={i} className="flex items-center gap-1.5 rounded-[3px] border border-ink-200 bg-white px-1.5 py-1"><span className={`block size-2 ${green}`} />{line('w-2/3', 'bg-ink-400')}<span className="ml-auto block h-[3px] w-4 rounded bg-ink-200" /></span>)}
    </div>
  ),
  accordion: () => (
    <div className="grid h-full content-center gap-1 px-2">
      {[0, 1, 2].map((i) => <span key={i} className="flex items-center justify-between rounded-[3px] border border-ink-200 bg-white px-1.5 py-1.5">{line('w-2/3', 'bg-ink-400')}<span className="text-[7px] leading-none text-ink-400">{i === 0 ? '−' : '+'}</span></span>)}
      {line('w-5/6', '-mt-0.5 ml-1.5')}
    </div>
  ),
  mediaText: () => (
    <div className="grid h-full grid-cols-2 items-center gap-2 px-2">
      <span className={`block h-full ${box}`} />
      <span className="grid gap-1"><span className="block h-[3px] w-1/3 rounded bg-green-600" /><span className="block h-[5px] w-5/6 rounded bg-ink-800" />{line('w-full')}{line('w-3/4')}<span className={`mt-0.5 block h-[6px] w-1/2 rounded-full ${green}`} /></span>
    </div>
  ),
  steps: () => (
    <div className="grid h-full content-center px-1">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((n) => <span key={n} className="grid gap-1 rounded-[4px] border border-ink-200 bg-white p-1.5"><span className="grid size-3.5 place-items-center rounded-[3px] bg-ink-900 text-[6px] font-bold leading-none text-gold-300">{n}</span>{line('w-3/4', 'bg-ink-400')}</span>)}
      </div>
    </div>
  ),
  timeline: () => (
    <div className="grid h-full content-center gap-1.5 px-3">
      {[0, 1, 2].map((i) => <span key={i} className="flex items-center gap-2"><span className={`block size-2 shrink-0 rounded-full ${green}`} /><span className="block h-[3px] w-5 rounded bg-green-700" />{line('w-1/2', 'bg-ink-400')}</span>)}
    </div>
  ),
  video: () => (
    <div className="grid h-full place-items-center px-3"><span className="grid h-full w-full place-items-center rounded-[4px] bg-ink-900"><span className="block size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" /></span></div>
  ),
  logos: () => (
    <div className="grid h-full content-center px-1"><div className="grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className="grid h-7 place-items-center rounded-[4px] border border-ink-200 bg-white"><span className={`block h-3 w-6 ${box}`} /></span>)}</div></div>
  ),
  gallery: () => (
    <div className="grid h-full content-center px-1"><div className="grid grid-cols-3 gap-1.5">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`block h-4 ${box}`} />)}</div></div>
  ),
  form: () => (
    <div className="grid h-full grid-cols-[1fr_1.2fr] items-center gap-2 px-2">
      <span className="grid gap-1"><span className="block h-[5px] w-full rounded bg-ink-800" />{line('w-4/5')}{line('w-3/5')}</span>
      <span className="grid gap-1 rounded-[4px] border border-ink-200 bg-white p-1.5">{[0, 1].map((i) => <span key={i} className="block h-[6px] w-full rounded-[2px] border border-ink-200" />)}<span className={`block h-[6px] w-1/2 rounded-full ${green}`} /></span>
    </div>
  ),
  cta: () => (
    <div className="flex h-full items-center justify-between gap-2 rounded-[4px] bg-green-700 p-2">
      <span className="grid flex-1 gap-1"><span className="block h-[5px] w-3/4 rounded bg-white/85" /><span className="block h-[3px] w-1/2 rounded bg-white/50" /></span>
      <span className="block h-[7px] w-10 rounded-full bg-white" />
    </div>
  ),
  org: () => (
    <div className="grid h-full content-center gap-1 px-3">
      <span className={`mx-auto block h-[6px] w-1/3 ${ink}`} />
      <span className="mx-auto block h-1.5 w-px bg-ink-300" />
      <span className="grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="grid gap-1 rounded-[3px] border border-ink-200 bg-white p-1"><span className="block h-[3px] w-2/3 rounded bg-green-700" />{line('w-full')}{line('w-3/4')}</span>)}</span>
    </div>
  ),
  text: () => (
    <div className="grid h-full content-center gap-1.5 px-3">{line('w-full')}{line('w-11/12')}{line('w-full')}{line('w-2/3')}<span className="mt-1 block h-[4px] w-1/3 rounded bg-ink-800" />{line('w-full')}{line('w-4/5')}</div>
  ),
  calculator: () => (
    <div className="grid h-full grid-cols-2 items-center gap-2 px-2">
      <span className="grid gap-1">{[0, 1, 2].map((i) => <span key={i} className="block h-[6px] w-full rounded-[2px] border border-ink-200 bg-white" />)}</span>
      <span className="grid gap-1 rounded-[4px] bg-ink-900 p-1.5"><span className="block h-[3px] w-1/2 rounded bg-white/40" /><span className="block h-[8px] w-3/4 rounded bg-gold-300" /><span className="block h-[3px] w-full rounded bg-white/30" /></span>
    </div>
  ),
  tabs: () => (
    <div className="grid h-full content-center gap-1 px-2">
      <span className="flex gap-1"><span className={`block h-[6px] w-8 ${ink}`} /><span className={`block h-[6px] w-8 ${box}`} /></span>
      <span className="grid gap-1 rounded-[4px] border border-ink-200 bg-white p-1.5">{line('w-full')}{line('w-3/4')}<span className={`block h-[6px] w-1/3 rounded-full ${green}`} /></span>
    </div>
  ),
  slider: () => (
    <div className="grid h-full content-center gap-1 px-3">
      <span className="grid gap-1 rounded-[4px] border border-ink-200 bg-white p-2"><span className="text-[9px] leading-none text-gold-500">“</span>{line('w-full')}{line('w-5/6')}<span className="mt-0.5 flex items-center gap-1"><span className={`block size-2.5 rounded-full ${box}`} />{line('w-1/3', 'bg-ink-400')}</span></span>
      <span className="mx-auto flex gap-1"><span className={`block h-[3px] w-4 rounded-full ${gold}`} /><span className={`block h-[3px] w-2 rounded-full ${box}`} /><span className={`block h-[3px] w-2 rounded-full ${box}`} /></span>
    </div>
  ),
  map: () => (
    <div className="grid h-full grid-cols-[1fr_1.4fr] items-stretch gap-2 px-2 py-1">
      <span className="grid gap-1">{[0, 1].map((i) => <span key={i} className="grid gap-1 rounded-[3px] border border-ink-200 bg-white p-1">{line('w-2/3', 'bg-ink-400')}{line('w-full')}</span>)}</span>
      <span className="relative block rounded-[4px] bg-green-50 ring-1 ring-inset ring-green-100"><span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600 ring-2 ring-white" /></span>
    </div>
  ),
  app: () => (
    <div className="grid h-full grid-cols-[1.3fr_1fr] items-center gap-2 rounded-[4px] bg-ink-900 p-2">
      <span className="grid gap-1"><span className="block h-[5px] w-5/6 rounded bg-white/85" /><span className="block h-[3px] w-2/3 rounded bg-white/40" /><span className="mt-0.5 flex gap-1"><span className="block h-[6px] w-7 rounded-[2px] bg-white" /><span className="block h-[6px] w-7 rounded-[2px] bg-white" /></span></span>
      <span className="mx-auto block h-full w-5 rounded-[4px] border border-white/40 bg-green-700" />
    </div>
  ),
}

const SKETCH_BY_TYPE: Record<string, keyof typeof SKETCHES> = {
  page_header: 'heading', hero_banner: 'hero', quick_access: 'strip', legality_bar: 'legal', branch_contact_strip: 'strip',
  stats_counter: 'stats', product_grid: 'products', cta_banner: 'cta', news_list: 'products', testimonial_slider: 'slider',
  lead_form: 'form', profiling_cta: 'cta', branch_finder: 'map', simulation_calculator: 'calculator', rich_text: 'text',
  accordion: 'accordion', feature_grid: 'cards', image_gallery: 'gallery', document_list: 'list', org_chart: 'org',
  post_index: 'products', job_list: 'list', faq_index: 'accordion', simulation_tabs: 'tabs', profiling_wizard: 'calculator',
  contact_cards: 'cards', media_text: 'mediaText', steps: 'steps', timeline: 'timeline', video_embed: 'video',
  logo_cloud: 'logos', app_download: 'app',
}

/** A 16:9 wireframe of the block, or a neutral card when the type has no drawing yet. */
export function BlockSketch({ type, className = '' }: { type: string; className?: string }) {
  const Sketch = SKETCHES[SKETCH_BY_TYPE[type] ?? 'cards']
  return (
    <div aria-hidden="true" className={`aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-tile)] border border-line bg-paper p-1.5 ${className}`}>
      <Sketch />
    </div>
  )
}
