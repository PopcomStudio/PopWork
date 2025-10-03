"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InvoicesDataTable } from './InvoicesDataTable'
import { InvoiceDialog } from './InvoiceDialog'
import { InvoiceView } from './InvoiceView'
import { ConfirmValidateDialog } from './dialogs/ConfirmValidateDialog'
import { ConfirmSendDialog } from './dialogs/ConfirmSendDialog'
import { ConfirmCancelDialog } from './dialogs/ConfirmCancelDialog'
import { PaymentDialog, type PaymentFormData } from './dialogs/PaymentDialog'
import { useInvoices } from '../hooks/use-invoices'
import { Plus, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Invoice } from '@/shared/types/database'

export function InvoiceManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // États pour les différents dialogs
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null)
  const [validatingInvoice, setValidatingInvoice] = useState<Invoice | null>(null)
  const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null)
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentTotalPaid, setPaymentTotalPaid] = useState(0)

  const {
    invoices,
    loading,
    error,
    setError,
    fetchInvoiceById,
    validateInvoiceAction,
    markAsSent,
    recordPayment,
    cancelInvoice,
    fetchPayments,
    fetchInvoices,
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

  // Voir les détails d'une facture
  const handleViewInvoice = (invoice: Invoice) => {
    setViewingInvoiceId(invoice.id)
  }

  // Valider une facture
  const handleValidateInvoice = (invoice: Invoice) => {
    setValidatingInvoice(invoice)
  }

  const handleConfirmValidate = async () => {
    if (!validatingInvoice) return
    try {
      await validateInvoiceAction(validatingInvoice.id)
      toast.success('Facture validée', {
        description: `La facture ${validatingInvoice.invoice_number} a été validée avec succès`,
      })
      await fetchInvoices()
      setValidatingInvoice(null)
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : 'Erreur lors de la validation',
      })
    }
  }

  // Marquer comme envoyée
  const handleSendInvoice = (invoice: Invoice) => {
    setSendingInvoice(invoice)
  }

  const handleConfirmSend = async (data: {
    sentDate: string
    sendMethod: 'email' | 'mail'
    recipientEmail?: string
  }) => {
    if (!sendingInvoice) return
    try {
      await markAsSent(sendingInvoice.id, data.sentDate)
      toast.success('Facture envoyée', {
        description: `La facture ${sendingInvoice.invoice_number} a été marquée comme envoyée`,
      })
      await fetchInvoices()
      setSendingInvoice(null)
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : "Erreur lors de l'envoi",
      })
    }
  }

  // Enregistrer un paiement
  const handleRecordPayment = async (invoice: Invoice) => {
    try {
      const payments = await fetchPayments(invoice.id)
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      setPaymentTotalPaid(totalPaid)
      setPaymentInvoice(invoice)
    } catch (err) {
      toast.error('Erreur', {
        description: 'Impossible de charger les paiements',
      })
    }
  }

  const handleConfirmPayment = async (data: PaymentFormData) => {
    if (!paymentInvoice) return
    try {
      await recordPayment(paymentInvoice.id, data)
      toast.success('Paiement enregistré', {
        description: `Le paiement de ${data.amount}€ a été enregistré`,
      })
      await fetchInvoices()
      setPaymentInvoice(null)
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement',
      })
    }
  }

  // Annuler une facture
  const handleCancelInvoice = (invoice: Invoice) => {
    setCancellingInvoice(invoice)
  }

  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingInvoice) return
    try {
      await cancelInvoice(cancellingInvoice.id, reason)
      toast.success('Facture annulée', {
        description: `La facture ${cancellingInvoice.invoice_number} a été annulée`,
      })
      await fetchInvoices()
      setCancellingInvoice(null)
    } catch (err) {
      toast.error('Erreur', {
        description: err instanceof Error ? err.message : "Erreur lors de l'annulation",
      })
    }
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
        onView={handleViewInvoice}
        onEdit={handleEditInvoice}
        onValidate={handleValidateInvoice}
        onSend={handleSendInvoice}
        onPayment={handleRecordPayment}
        onCancel={handleCancelInvoice}
      />

      {/* Dialog de création/édition */}
      <InvoiceDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        editingInvoice={editingInvoice}
      />

      {/* Vue détaillée */}
      <InvoiceView
        invoiceId={viewingInvoiceId}
        open={viewingInvoiceId !== null}
        onClose={() => setViewingInvoiceId(null)}
        onEdit={handleEditInvoice}
      />

      {/* Dialogs de confirmation */}
      <ConfirmValidateDialog
        open={validatingInvoice !== null}
        onClose={() => setValidatingInvoice(null)}
        invoice={validatingInvoice}
        onConfirm={handleConfirmValidate}
      />

      <ConfirmSendDialog
        open={sendingInvoice !== null}
        onClose={() => setSendingInvoice(null)}
        invoice={sendingInvoice}
        onConfirm={handleConfirmSend}
      />

      <ConfirmCancelDialog
        open={cancellingInvoice !== null}
        onClose={() => setCancellingInvoice(null)}
        invoice={cancellingInvoice}
        onConfirm={handleConfirmCancel}
      />

      <PaymentDialog
        open={paymentInvoice !== null}
        onClose={() => setPaymentInvoice(null)}
        invoice={paymentInvoice}
        totalPaid={paymentTotalPaid}
        onConfirm={handleConfirmPayment}
      />
    </div>
  )
}
