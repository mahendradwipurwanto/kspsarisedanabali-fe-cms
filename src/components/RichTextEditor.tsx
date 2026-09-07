'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote,
  Link2, Link2Off, ImagePlus, Table as TableIcon, Minus, Undo2, Redo2, Eraser,
  AlignLeft, AlignCenter, AlignRight, Rows3, Columns3, Trash2, Heading2, Heading3, Pilcrow,
} from 'lucide-react'
import { toast } from 'sonner'
import { MediaPicker } from './MediaPicker'
import { Modal, Button, inputCls } from './ui'
import { uploadFile, uploadProblem } from '@/lib/api'
import { LP_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

/*
 * Inline images are stored the way every other image field is: as the site's
 * own `/api/media/<key>` address, so the article keeps working if the domain
 * changes. The console sits on another origin, so it has to point those at the
 * website while editing and put them back before saving.
 */
const toDisplay = (html: string) => html.replaceAll('src="/api/media/', `src="${LP_URL}/api/media/`)
const toStored = (html: string) => html.replaceAll(`src="${LP_URL}/api/media/`, 'src="/api/media/')

/** Tiptap leaves an emptied document as `<p></p>`; the field should read as empty. */
const isBlank = (html: string) =>
  !html.includes('<img') && !html.includes('<table') && html.replace(/<[^>]+>/g, '').trim() === ''

/** What the field stores for a given editor document. */
const serialise = (html: string) => (isBlank(html) ? '' : toStored(html))

/**
 * The article editor.
 *
 * Writing news in raw HTML asked staff to know tags; this is the same content
 * — it still saves HTML, which is what the website renders — written the way a
 * document is written. Images can be pasted or dropped straight in and are
 * uploaded to the media library on the way.
 */
export function RichTextEditor({
  value, onChange, disabled,
}: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkHref, setLinkHref] = useState('')
  const [uploading, setUploading] = useState(false)

  // The paste and drop handlers are built once with the editor, so they read
  // the instance from a ref rather than closing over one that does not exist yet.
  const editorRef = useRef<Editor | null>(null)

  /** Upload the images out of a paste or a drop and insert them where the cursor is. */
  const handleImageFiles = useCallback((files: File[]): boolean => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) return false

    void (async () => {
      setUploading(true)
      const failed: string[] = []
      let inserted = 0
      for (const file of images) {
        const problem = uploadProblem(file, 'image')
        if (problem) { failed.push(problem); continue }
        try {
          const res = await uploadFile(file, 'media', '')
          editorRef.current?.chain().focus().setImage({ src: `${LP_URL}/api/media/${encodeURIComponent(res.data.key)}` }).run()
          inserted += 1
        } catch (e) {
          failed.push(`${file.name}: ${(e as Error).message}`)
        }
      }
      setUploading(false)
      if (failed.length) toast.error(inserted ? 'Sebagian gambar gagal diunggah' : 'Gagal mengunggah gambar', { description: failed.join(' '), duration: 8000 })
      else toast.success(inserted === 1 ? 'Gambar terunggah' : `${inserted} gambar terunggah`)
    })()

    // Handled here, so ProseMirror does not also drop the raw file in.
    return true
  }, [])

  const editor = useEditor({
    // Next renders this on the server first; Tiptap must wait for the browser.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: toDisplay(value ?? ''),
    editorProps: {
      attributes: { class: 'rte-content' },
      handlePaste: (_view, event) => handleImageFiles(Array.from(event.clipboardData?.files ?? [])),
      handleDrop: (_view, event) => handleImageFiles(Array.from((event as DragEvent).dataTransfer?.files ?? [])),
    },
    onUpdate: ({ editor: e }) => onChange(serialise(e.getHTML())),
  })

  editorRef.current = editor

  // A different record arrives as a new `value`; the editor owns its document
  // in between, so it is only replaced when the two genuinely differ.
  useEffect(() => {
    if (!editor) return
    if (serialise(editor.getHTML()) === (value ?? '')) return
    editor.commands.setContent(toDisplay(value ?? ''), { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])

  if (!editor) {
    return <div className="h-64 rounded-[var(--radius-input)] border border-line bg-paper" aria-hidden="true" />
  }

  function openLinkDialog() {
    setLinkHref(editor!.getAttributes('link').href ?? '')
    setLinkOpen(true)
  }

  function applyLink() {
    const href = linkHref.trim()
    if (!href) {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const url = /^(https?:|mailto:|tel:|\/|#)/.test(href) ? href : `https://${href}`
      editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkOpen(false)
  }

  const inTable = editor.isActive('table')

  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-input)] border border-line bg-white', disabled && 'opacity-60')}>
      <div className="scroll-thin flex flex-wrap items-center gap-0.5 overflow-x-auto border-b border-line bg-paper px-1.5 py-1.5">
        <Group>
          <Tool label="Paragraf" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow className="size-4" /></Tool>
          <Tool label="Judul bagian" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Tool>
          <Tool label="Sub judul" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Tool>
        </Group>

        <Group>
          <Tool label="Tebal" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Tool>
          <Tool label="Miring" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Tool>
          <Tool label="Garis bawah" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Tool>
          <Tool label="Coret" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></Tool>
        </Group>

        <Group>
          <Tool label="Daftar butir" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Tool>
          <Tool label="Daftar bernomor" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Tool>
          <Tool label="Kutipan" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Tool>
        </Group>

        <Group>
          <Tool label="Rata kiri" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="size-4" /></Tool>
          <Tool label="Rata tengah" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="size-4" /></Tool>
          <Tool label="Rata kanan" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="size-4" /></Tool>
        </Group>

        <Group>
          <Tool label="Tautan" active={editor.isActive('link')} onClick={openLinkDialog}><Link2 className="size-4" /></Tool>
          <Tool label="Hapus tautan" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}><Link2Off className="size-4" /></Tool>
          <Tool label={uploading ? 'Mengunggah gambar…' : 'Sisipkan gambar'} disabled={uploading} onClick={() => setPickerOpen(true)}><ImagePlus className="size-4" /></Tool>
          <Tool label="Garis pemisah" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Tool>
        </Group>

        <Group>
          <Tool label="Sisipkan tabel" active={inTable} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="size-4" /></Tool>
          <Tool label="Tambah baris" disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 className="size-4" /></Tool>
          <Tool label="Tambah kolom" disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="size-4" /></Tool>
          <Tool label="Hapus tabel" disabled={!inTable} onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="size-4" /></Tool>
        </Group>

        <Group last>
          <Tool label="Bersihkan format" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser className="size-4" /></Tool>
          <Tool label="Batalkan" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Tool>
          <Tool label="Ulangi" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Tool>
        </Group>
      </div>

      <EditorContent editor={editor} className="rte scroll-thin max-h-[60vh] overflow-y-auto" />

      <p className="border-t border-line bg-paper px-3 py-1.5 text-[11.5px] text-ink-400">
        {uploading ? 'Mengunggah gambar…' : 'Gambar bisa langsung ditempel (Ctrl+V) atau diseret ke dalam tulisan.'}
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) => {
          editor.chain().focus().setImage({ src: `${LP_URL}/api/media/${encodeURIComponent(m.key)}`, alt: m.alt ?? '' }).run()
          setPickerOpen(false)
        }}
      />

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Tautan"
        description="Kosongkan lalu simpan untuk menghapus tautan."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>Batal</Button>
            <Button variant="dark" onClick={applyLink}>Simpan</Button>
          </>
        }
      >
        <input
          autoFocus
          value={linkHref}
          onChange={(e) => setLinkHref(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } }}
          placeholder="https://… atau /halaman"
          aria-label="Alamat tautan"
          className={`${inputCls} mono`}
        />
      </Modal>
    </div>
  )
}

function Group({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div className={cn('flex items-center gap-0.5', !last && 'mr-1 border-r border-line pr-1.5')}>{children}</div>
  )
}

function Tool({
  label, children, onClick, active, disabled,
}: { label: string; children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The editor must keep the selection the button acts on.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-[6px] transition-colors',
        active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        disabled && 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-ink-600',
      )}
    >
      {children}
    </button>
  )
}
