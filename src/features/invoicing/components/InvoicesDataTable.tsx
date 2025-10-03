"use client"

import { useState, useMemo } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  AlertCircle,
} from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/shared/types/database'
import { formatAmount } from '../utils/vat-calculator'
import { InvoiceActions, type InvoiceAction } from './InvoiceActions'

interface InvoicesDataTableProps {
  invoices: Invoice[]
  onView: (invoice: Invoice) => void
  onEdit: (invoice: Invoice) => void
  onValidate: (invoice: Invoice) => void
  onSend: (invoice: Invoice) => void
  onPayment: (invoice: Invoice) => void
  onCancel: (invoice: Invoice) => void
}

// Badge de statut avec couleurs
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const variants: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Brouillon', variant: 'secondary' },
    validated: { label: 'Validée', variant: 'default' },
    sent: { label: 'Envoyée', variant: 'outline' },
    paid: { label: 'Payée', variant: 'default' },
    partial_paid: { label: 'Payée partiellement', variant: 'outline' },
    overdue: { label: 'En retard', variant: 'destructive' },
    cancelled: { label: 'Annulée', variant: 'destructive' },
  }

  const config = variants[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function InvoicesDataTable({
  invoices,
  onView,
  onEdit,
  onValidate,
  onSend,
  onPayment,
  onCancel,
}: InvoicesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'invoice_date', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // Handler pour les actions
  const handleAction = (action: InvoiceAction, invoice: Invoice) => {
    switch (action) {
      case 'view':
        onView(invoice)
        break
      case 'edit':
        onEdit(invoice)
        break
      case 'validate':
        onValidate(invoice)
        break
      case 'send':
        onSend(invoice)
        break
      case 'payment':
        onPayment(invoice)
        break
      case 'cancel':
        onCancel(invoice)
        break
      case 'download':
        // TODO: Implémenter le téléchargement PDF
        console.log('Download PDF:', invoice.id)
        break
      case 'delete':
        // TODO: Implémenter la suppression
        console.log('Delete invoice:', invoice.id)
        break
      case 'credit_note':
        // TODO: Implémenter la création d'avoir
        console.log('Create credit note for:', invoice.id)
        break
    }
  }

  // Colonnes du tableau
  const columns: ColumnDef<Invoice>[] = useMemo(
    () => [
      {
        accessorKey: 'invoice_number',
        header: 'Numéro',
        cell: ({ row }) => (
          <div className="font-mono font-medium">{row.original.invoice_number}</div>
        ),
      },
      {
        accessorKey: 'invoice_date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="text-sm">
            {new Date(row.original.invoice_date).toLocaleDateString('fr-FR')}
          </div>
        ),
      },
      {
        accessorKey: 'customer_name',
        header: 'Client',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customer_name}</div>
            {row.original.customer_siret && (
              <div className="text-xs text-muted-foreground font-mono">
                {row.original.customer_siret}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'total_including_tax',
        header: 'Montant TTC',
        cell: ({ row }) => (
          <div className="font-medium">
            {formatAmount(row.original.total_including_tax)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Statut',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: 'payment_due_date',
        header: 'Échéance',
        cell: ({ row }) => {
          const dueDate = new Date(row.original.payment_due_date)
          const today = new Date()
          const isOverdue = dueDate < today && row.original.status !== 'paid'

          return (
            <div className="text-sm">
              <div className={isOverdue ? 'text-destructive font-medium' : ''}>
                {dueDate.toLocaleDateString('fr-FR')}
              </div>
              {isOverdue && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  En retard
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const invoice = row.original

          return (
            <InvoiceActions
              invoice={invoice}
              onAction={(action) => handleAction(action, invoice)}
            />
          )
        },
      },
    ],
    [handleAction]
  )

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une facture..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(value) =>
            table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="validated">Validées</SelectItem>
            <SelectItem value="sent">Envoyées</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucune facture trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} facture(s) au total
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Lignes par page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} sur{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Aller à la première page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Page précédente</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Page suivante</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Aller à la dernière page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
