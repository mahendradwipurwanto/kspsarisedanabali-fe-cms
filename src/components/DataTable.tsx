'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  useReactTable, type ColumnDef, type ColumnFiltersState, type FilterFn, type SortingState,
  type Table as TanstackTable, type VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown,
  Download, Search, Settings2, Trash2, Plus, X,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button, inputCls, selectCls, Spinner } from './ui'
import { cn } from '@/lib/utils'

/** Sortable header button, the shadcn data-table pattern. */
export function SortHeader<T>({ column, children, align = 'left' }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void }; children: ReactNode; align?: 'left' | 'right' }) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        '-ml-2 inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[12.5px] font-semibold transition-colors hover:bg-ink-100 hover:text-ink-900',
        sorted ? 'text-ink-900' : 'text-ink-500',
        align === 'right' && '-mr-2 ml-0 flex-row-reverse',
      )}
    >
      {children}
      <Icon className={cn('size-3.5', sorted ? 'text-ink-900' : 'text-ink-300')} aria-hidden="true" />
    </button>
  )
}

/**
 * The shadcn data table: a plain, readable table with sortable headers, a
 * search box, column visibility, row selection and pagination.
 *
 * Rows are read here and changed in a form, which is the flow the koperasi's
 * staff asked for after trying cell-by-cell editing.
 */
export function DataTable<T extends { id: string }>({
  columns, data, loading, storageKey, searchPlaceholder = 'Cari…', globalFilter, onGlobalFilter,
  onCreate, createLabel = 'Tambah', canWrite, onDeleteMany, onExport, toolbar, emptyState,
  pageSize: initialPageSize = 25, onRowClick, globalFilterFn, initialVisibility,
}: {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  /** Remembers which columns are hidden, per screen. */
  storageKey: string
  searchPlaceholder?: string
  /** Controlled search, for screens whose filtering happens on the server. */
  globalFilter?: string
  onGlobalFilter?: (v: string) => void
  onCreate?: () => void
  createLabel?: string
  canWrite?: boolean
  onDeleteMany?: (rows: T[]) => Promise<void> | void
  onExport?: () => void
  toolbar?: ReactNode
  emptyState?: ReactNode
  pageSize?: number
  onRowClick?: (row: T) => void
  /** Search across every field, not only the visible string columns. */
  globalFilterFn?: FilterFn<T>
  /** Columns switched off until the reader turns them on. */
  initialVisibility?: VisibilityState
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility ?? {})
  const [rowSelection, setRowSelection] = useState({})
  const [internalFilter, setInternalFilter] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const controlled = globalFilter !== undefined
  const filterValue = controlled ? globalFilter : internalFilter

  // Column visibility is remembered per screen; hydrate before the first save.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ksp.table.${storageKey}`)
      if (raw) setColumnVisibility({ ...(initialVisibility ?? {}), ...(JSON.parse(raw) as VisibilityState) })
    } catch { /* a blocked store is not worth an error */ }
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(`ksp.table.${storageKey}`, JSON.stringify(columnVisibility)) } catch { /* ignore */ }
  }, [hydrated, storageKey, columnVisibility])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter: controlled ? '' : internalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setInternalFilter,
    globalFilterFn,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
  })

  const selected = table.getFilteredSelectedRowModel().rows.map((r) => r.original)
  const hideable = table.getAllColumns().filter((c) => c.getCanHide())

  return (
    <div className="grid gap-3">
      {/* ── toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            value={filterValue}
            onChange={(e) => (controlled ? onGlobalFilter?.(e.target.value) : setInternalFilter(e.target.value))}
            placeholder={searchPlaceholder}
            aria-label="Cari"
            className={cn(inputCls, 'h-9 pl-8 text-[13px]')}
          />
          {filterValue ? (
            <button
              type="button"
              onClick={() => (controlled ? onGlobalFilter?.('') : setInternalFilter(''))}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>

        {toolbar}

        <div className="ml-auto flex items-center gap-2">
          {selected.length && onDeleteMany ? (
            <Button size="sm" variant="dangerGhost" onClick={() => void onDeleteMany(selected)}>
              <Trash2 className="size-3.5" /> Hapus {selected.length}
            </Button>
          ) : null}

          {onExport ? <Button size="sm" variant="secondary" onClick={onExport}><Download className="size-3.5" /> CSV</Button> : null}

          {hideable.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary"><Settings2 className="size-3.5" /> Kolom</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {typeof column.columnDef.meta === 'object' && column.columnDef.meta && 'label' in column.columnDef.meta
                      ? String((column.columnDef.meta as { label: string }).label)
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {canWrite && onCreate ? (
            <Button size="sm" variant="dark" onClick={onCreate}><Plus className="size-3.5" /> {createLabel}</Button>
          ) : null}
        </div>
      </div>

      {/* ── table ── */}
      <div className="surface overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <Table>
            <TableHeader className="bg-paper">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-paper">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={table.getAllColumns().length} className="p-0">
                    {emptyState ?? <p className="px-4 py-12 text-center text-[13.5px] text-ink-500">Tidak ada data.</p>}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── pagination ── */}
      {!loading && data.length ? <Pagination table={table} selectedCount={selected.length} /> : null}
    </div>
  )
}

function Pagination<T>({ table, selectedCount }: { table: TanstackTable<T>; selectedCount: number }) {
  const total = table.getFilteredRowModel().rows.length
  const { pageIndex, pageSize } = table.getState().pagination
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-500">
      <span className="tnum">
        {selectedCount ? `${selectedCount} dari ${total} baris dipilih` : `Menampilkan ${from}–${to} dari ${total} baris`}
      </span>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Baris per halaman</span>
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            aria-label="Baris per halaman"
            className={cn(selectCls, 'h-8 !w-auto !py-0 text-[12.5px] leading-none')}
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <span className="tnum">Halaman {pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}</span>

        <div className="flex items-center gap-1">
          <PageButton label="Halaman pertama" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="size-4" /></PageButton>
          <PageButton label="Halaman sebelumnya" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="size-4" /></PageButton>
          <PageButton label="Halaman berikutnya" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="size-4" /></PageButton>
          <PageButton label="Halaman terakhir" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="size-4" /></PageButton>
        </div>
      </div>
    </div>
  )
}

function PageButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-8 place-items-center rounded-[var(--radius-input)] border border-line bg-white text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
    >
      {children}
    </button>
  )
}

export const useTableMemo = useMemo
