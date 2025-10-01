"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InvoicesDataTable } from './InvoicesDataTable'
import { InvoiceDialog } from './InvoiceDialog'
import { useInvoices } from '../hooks/use-invoices'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import type { Invoice } from '@/shared/types/database'

export function InvoiceManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  const {
    invoices,
    loading,
    error,
    setError,
    fetchInvoiceById,
  } = useInvoices()

  // Ouvrir le dialogue pour créer une nouvelle facture
  const handleNewInvoice = () => {
    setEditingInvoice(null)
    setIsDialogOpen(true)
  }

  // Ouvrir le dialogue pour éditer une facture
  const handleEditInvoice = async (invoice: Invoice) => {
    try {
      // Charger la facture complète avec ses lignes
      const invoiceData = await fetchInvoiceById(invoice.id)
      if (invoiceData) {
        setEditingInvoice(invoiceData.invoice)
        setIsDialogOpen(true)
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la facture:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    }
  }

  // Fermer le dialogue
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingInvoice(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Facturation
          </h2>
          <p className="text-muted-foreground mt-2">
            Gérez vos factures conformes à la réglementation française (EN-16931)
          </p>
        </div>
        <Button onClick={handleNewInvoice} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nouvelle facture
        </Button>
      </div>

      {/* Erreur globale */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tableau des factures */}
      <InvoicesDataTable
        invoices={invoices}
        onEdit={handleEditInvoice}
      />

      {/* Dialog de création/édition */}
      <InvoiceDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        editingInvoice={editingInvoice}
      />
    </div>
  )
}
