import { getBlock, defaultPropsFor, type FieldDef, type FieldMap } from '@/contracts'

/**
 * Sample content for previewing a block before it is added.
 *
 * Built from the block's own field definitions, so every block, including
 * one added next month, gets a preview without anyone writing sample text for
 * it: a text field shows its placeholder or its label, a repeater gets three
 * items, an image gets a picture from the media library. Blocks that draw
 * their rows from records (products, news, offices) show the real records.
 */
const ipsum = 'Kalimat contoh untuk melihat bentuk bagian ini di website sebelum diisi dengan teks yang sebenarnya.'

function sampleLeaf(def: FieldDef, key: string, image: string, depth: number): unknown {
  switch (def.kind) {
    case 'text': return def.default || def.placeholder || def.label
    case 'textarea': return def.default || def.placeholder || ipsum
    case 'richtext': return `<p>${ipsum}</p><p>Paragraf kedua, dengan <strong>penekanan</strong> dan <a href="/produk">tautan</a>.</p>`
    case 'number': return def.default ?? def.min ?? 1
    case 'boolean': return def.default ?? false
    case 'select': return def.default ?? def.options[0]?.value ?? ''
    case 'image': return image
    case 'link': return def.default || (key.toLowerCase().includes('secondary') ? '/profiling' : '/produk')
    case 'icon': return def.default || 'spark'
    case 'color': return def.default || ''
    case 'reference': return def.multiple ? [] : ''
    case 'repeater': {
      // Three items reads as a row; nested repeaters stay short so a chart or a
      // menu does not explode.
      const n = depth === 0 ? Math.min(3, def.max ?? 3) : Math.min(2, def.max ?? 2)
      return Array.from({ length: Math.max(n, def.min ?? 0) }, (_, i) => sampleFields(def.of, image, depth + 1, i))
    }
  }
}

function sampleFields(fields: FieldMap, image: string, depth: number, index = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(fields)) {
    const v = sampleLeaf(def, key, image, depth)
    // Number the items of a list so three of them do not read as one repeated;
    // a placeholder such as "2002" or "Kasir" already reads as content and is
    // left alone.
    const fromLabel = def.kind === 'text' && !def.default && !def.placeholder
    out[key] = typeof v === 'string' && depth > 0 && fromLabel ? `${v} ${index + 1}` : v
  }
  return out
}

export function sampleProps(type: string, image = ''): Record<string, unknown> {
  const def = getBlock(type)
  if (!def) return {}
  return { ...defaultPropsFor(type), ...sampleFields(def.fields, image, 0) }
}
